from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsManagerOrAdmin, IsManagerOrReadOnly

from . import exports, selectors, services
from .filters import CategoryFilter, ProductFilter
from .serializers import (
    CategoryOptionSerializer,
    CategorySerializer,
    ProductOptionSerializer,
    ProductSerializer,
    StockAdjustSerializer,
)


@extend_schema(tags=["Categories"])
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsManagerOrReadOnly]
    filterset_class = CategoryFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "product_count", "stock_value", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return selectors.category_queryset()

    def perform_create(self, serializer):
        serializer.instance = services.create_category(**serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = services.update_category(
            category=serializer.instance, **serializer.validated_data
        )

    # Named `options_list` so it never shadows DRF's HTTP OPTIONS handler
    @extend_schema(responses=CategoryOptionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="options", pagination_class=None)
    def options_list(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True)
        return Response(CategoryOptionSerializer(queryset, many=True).data)


@extend_schema_view(
    destroy=extend_schema(
        description="Deletes a product that has never moved stock. Otherwise returns 409 – archive it instead."
    )
)
@extend_schema(tags=["Products"])
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsManagerOrReadOnly]
    filterset_class = ProductFilter
    search_fields = ["name", "sku", "barcode", "category__name"]
    ordering_fields = ["name", "sku", "selling_price", "cost_price", "quantity", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        return selectors.product_queryset()

    def perform_create(self, serializer):
        serializer.instance = services.create_product(user=self.request.user, **serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = services.update_product(
            product=serializer.instance, **serializer.validated_data
        )

    @extend_schema(
        parameters=[OpenApiParameter("in_stock", bool, description="Only products with quantity > 0")],
        responses=ProductOptionSerializer(many=True),
    )
    @action(detail=False, methods=["get"], url_path="options", pagination_class=None)
    def options_list(self, request):
        """Active products for pickers (POS). Supports ?search=, ?category= and ?in_stock=true."""
        queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True)
        if request.query_params.get("in_stock") == "true":
            queryset = queryset.filter(quantity__gt=0)
        return Response(ProductOptionSerializer(queryset[:60], many=True).data)

    @extend_schema(
        responses=inline_serializer(
            "ProductSummary",
            {
                "total": serializers.IntegerField(),
                "in_stock": serializers.IntegerField(),
                "low_stock": serializers.IntegerField(),
                "out_of_stock": serializers.IntegerField(),
                "archived": serializers.IntegerField(),
            },
        )
    )
    @action(detail=False, methods=["get"], pagination_class=None, filter_backends=[])
    def summary(self, request):
        return Response(selectors.product_status_summary())

    @extend_schema(request=StockAdjustSerializer, responses=ProductSerializer)
    @action(detail=True, methods=["post"], url_path="adjust-stock", permission_classes=[IsManagerOrAdmin])
    def adjust_stock(self, request, pk=None):
        """Stock-take: set quantity to the physically counted amount."""
        from apps.inventory.services import adjust_to

        product = self.get_object()
        serializer = StockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        adjust_to(product=product, user=request.user, **serializer.validated_data)
        product.refresh_from_db()
        return Response(ProductSerializer(product).data)

    @extend_schema(responses={(200, "text/csv"): OpenApiResponse(description="CSV file")})
    @action(detail=False, methods=["get"], pagination_class=None)
    def export(self, request):
        """Export (respects the same filters/search as the list)."""
        return exports.export_products_csv(self.filter_queryset(self.get_queryset()))
