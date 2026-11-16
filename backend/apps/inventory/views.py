from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from . import services
from .filters import StockMovementFilter
from .models import StockMovement
from .serializers import StockMovementCreateSerializer, StockMovementSerializer

Type = StockMovement.Type


@extend_schema(tags=["Stock movements"])
class StockMovementViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Immutable stock ledger. Movements can be created and read – never edited or deleted."""

    serializer_class = StockMovementSerializer
    filterset_class = StockMovementFilter
    search_fields = ["product__name", "product__sku", "reference", "note"]
    ordering_fields = ["created_at", "quantity"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        return StockMovement.objects.select_related("product", "supplier", "created_by")

    @extend_schema(request=StockMovementCreateSerializer, responses={201: StockMovementSerializer})
    def create(self, request, *args, **kwargs):
        serializer = StockMovementCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        kind = data["movement_type"]

        if kind == Type.IN:
            movement = services.stock_in(
                product=data["product"],
                quantity=data["quantity"],
                user=request.user,
                unit_cost=data.get("unit_cost"),
                supplier=data.get("supplier"),
                reference=data["reference"],
                note=data["note"],
            )
        elif kind == Type.OUT:
            movement = services.stock_out(
                product=data["product"],
                quantity=data["quantity"],
                user=request.user,
                reference=data["reference"],
                note=data["note"],
            )
        else:
            movement = services.adjust_to(
                product=data["product"],
                counted_quantity=data["quantity"],
                user=request.user,
                note=data["note"],
            )

        movement = self.get_queryset().get(pk=movement.pk)
        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)
