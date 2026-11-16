from rest_framework import serializers

from apps.catalog.models import Product, Supplier

from .models import StockMovement

Type = StockMovement.Type


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_unit = serializers.CharField(source="product.unit", read_only=True)
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)
    created_by_name = serializers.SerializerMethodField()
    direction = serializers.CharField(read_only=True)
    signed_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "product_unit",
            "movement_type",
            "movement_type_display",
            "direction",
            "quantity",
            "signed_quantity",
            "quantity_before",
            "quantity_after",
            "unit_cost",
            "supplier",
            "supplier_name",
            "reference",
            "note",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.full_name if obj.created_by else None


class StockMovementCreateSerializer(serializers.Serializer):
    """
    IN / OUT: `quantity` = units moved (> 0)
    ADJUSTMENT: `quantity` = physically counted units (>= 0), managers only
    """

    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True))
    movement_type = serializers.ChoiceField(choices=[Type.IN, Type.OUT, Type.ADJUSTMENT])
    quantity = serializers.IntegerField(min_value=0, max_value=10_000_000)
    unit_cost = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.filter(is_active=True), required=False, allow_null=True
    )
    reference = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        user = self.context["request"].user
        kind = attrs["movement_type"]
        if kind == Type.ADJUSTMENT and not user.is_manager_or_above:
            raise serializers.ValidationError(
                {"movement_type": ["Only managers can make stock adjustments."]}
            )
        if kind in (Type.IN, Type.OUT) and attrs["quantity"] == 0:
            raise serializers.ValidationError({"quantity": ["Quantity must be at least 1."]})
        if kind != Type.IN and (attrs.get("unit_cost") is not None or attrs.get("supplier")):
            raise serializers.ValidationError("Unit cost and supplier only apply to stock-in movements.")
        return attrs
