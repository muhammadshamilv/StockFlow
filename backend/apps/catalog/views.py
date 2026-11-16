from django.http import HttpResponse
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.permissions import IsManagerOrAdmin, IsManagerOrReadOnly
from apps.core.signals import emit_activity

from . import importers, selectors, services
from .filters import CategoryFilter, ProductFilter, SupplierFilter
from .serializers import (
    CategoryOptionSerializer,
    CategorySerializer,
    ProductImportResultSerializer,
    ProductImportSerializer,
    ProductOptionSerializer,
    ProductSerializer,
    StockAdjustSerializer,
    SupplierOptionSerializer,
    SupplierSerializer,
)


class OptionsMixin:
    """GET /<resource>/options/ -> unpaginated, lightweight list for dropdowns.

    (Named `options_list` so it never shadows DRF's HTTP OPTIONS handler.)
    """

    option_serializer_class = None

    def options_list(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True)[:500]
        return Response(self.option_serializer_class(queryset, many=True, context={"request": request}).data)


@extend_schema(tags=["Categories"])
class CategoryViewSet(OptionsMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    option_serializer_class = CategoryOptionSerializer
    permission_classes = [IsManagerOrReadOnly]
    filterset_class = CategoryFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "product_count", "stock_value", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return selectors.category_queryset()

    def perform_create(self, serializer):
        serializer.instance = services.create_category(user=self.request.user, **serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = services.update_category(
            category=serializer.instance, user=self.request.user, **serializer.validated_data
        )

    def perform_destroy(self, instance):
        emit_activity(actor=self.request.user, verb="category.deleted", metadata={"name": instance.name})
        instance.delete()

    @extend_schema(responses=CategoryOptionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="options", pagination_class=None)
    def options_list(self, request):
        return super().options_list(request)


@extend_schema(tags=["Suppliers"])
class SupplierViewSet(OptionsMixin, viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    option_serializer_class = SupplierOptionSerializer
    permission_classes = [IsManagerOrReadOnly]
    filterset_class = SupplierFilter
    search_fields = ["name", "contact_person", "email", "phone", "tax_id"]
    ordering_fields = ["name", "product_count", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return selectors.supplier_queryset()

    def perform_create(self, serializer):
        serializer.instance = services.create_supplier(user=self.request.user, **serializer.validated_data)

    def perform_update(self, serializer):
        supplier = serializer.save()
        emit_activity(actor=self.request.user, verb="supplier.updated", target=supplier)

    def perform_destroy(self, instance):
        emit_activity(actor=self.request.user, verb="supplier.deleted", metadata={"name": instance.name})
        instance.delete()

    @extend_schema(responses=SupplierOptionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="options", pagination_class=None)
    def options_list(self, request):
        return super().options_list(request)


@extend_schema_view(
    destroy=extend_schema(
        description="Deletes a product that has never moved stock. Otherwise returns 409 – archive it instead."
    )
)
@extend_schema(tags=["Products"])
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsManagerOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
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
            product=serializer.instance, user=self.request.user, **serializer.validated_data
        )

    def perform_destroy(self, instance):
        emit_activity(
            actor=self.request.user,
            verb="product.deleted",
            metadata={"sku": instance.sku, "name": instance.name},
        )
        instance.delete()

    # ------------------------------------------------------------------ #
    @extend_schema(responses=ProductOptionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="options", pagination_class=None)
    def options_list(self, request):
        """Active products for pickers (POS). Supports ?search= and ?in_stock=true."""
        queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True)
        if request.query_params.get("in_stock") == "true":
            queryset = queryset.filter(quantity__gt=0)
        return Response(ProductOptionSerializer(queryset[:50], many=True, context={"request": request}).data)

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
        return Response(ProductSerializer(product, context={"request": request}).data)

    @extend_schema(responses={(200, "text/csv"): OpenApiResponse(description="CSV file")})
    @action(detail=False, methods=["get"], pagination_class=None)
    def export(self, request):
        """Export (respects the same filters/search as the list)."""
        return importers.export_products_csv(self.filter_queryset(self.get_queryset()))

    @extend_schema(responses={(200, "text/csv"): OpenApiResponse(description="CSV template")})
    @action(
        detail=False, methods=["get"], url_path="import-template", pagination_class=None, filter_backends=[]
    )
    def import_template(self, request):
        response = HttpResponse(importers.import_template_csv(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="stockflow-import-template.csv"'
        return response

    @extend_schema(
        request={"multipart/form-data": ProductImportSerializer}, responses=ProductImportResultSerializer
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="import",
        permission_classes=[IsManagerOrAdmin],
        parser_classes=[MultiPartParser],
    )
    def import_csv(self, request):
        serializer = ProductImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = importers.import_products_csv(file=serializer.validated_data["file"], user=request.user)
        code = status.HTTP_200_OK if not result["errors"] else status.HTTP_207_MULTI_STATUS
        return Response(result, status=code)
