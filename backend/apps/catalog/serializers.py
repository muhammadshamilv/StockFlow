from rest_framework import serializers

from .models import Category, Product


def _ci_unique(model, field: str, value: str, instance=None, message: str = "") -> None:
    qs = model.objects.filter(**{f"{field}__iexact": value})
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise serializers.ValidationError(message or f"A record with this {field} already exists.")


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    stock_units = serializers.IntegerField(read_only=True)
    stock_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "color",
            "is_active",
            "product_count",
            "stock_units",
            "stock_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        value = value.strip()
        _ci_unique(Category, "name", value, self.instance, "A category with this name already exists.")
        return value


class CategoryOptionSerializer(serializers.ModelSerializer):
    """Light payload for dropdowns."""

    class Meta:
        model = Category
        fields = ["id", "name", "color"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    stock_status = serializers.CharField(read_only=True)
    stock_status_display = serializers.SerializerMethodField()
    margin_percent = serializers.DecimalField(max_digits=6, decimal_places=1, read_only=True, allow_null=True)
    stock_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    sku = serializers.CharField(max_length=40, required=False, allow_blank=True)
    opening_stock = serializers.IntegerField(
        write_only=True, required=False, min_value=0, max_value=1_000_000, default=0
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "barcode",
            "name",
            "description",
            "category",
            "category_name",
            "category_color",
            "unit",
            "unit_display",
            "cost_price",
            "selling_price",
            "quantity",
            "reorder_level",
            "stock_status",
            "stock_status_display",
            "margin_percent",
            "stock_value",
            "is_active",
            "opening_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["quantity", "created_at", "updated_at"]

    def get_stock_status_display(self, obj: Product) -> str:
        return Product.StockStatus(obj.stock_status).label

    def validate_sku(self, value: str) -> str:
        value = value.strip().upper()
        if value:
            _ci_unique(Product, "sku", value, self.instance, "This SKU is already in use.")
        elif self.instance is not None:
            raise serializers.ValidationError("SKU cannot be empty.")
        return value

    def validate_name(self, value: str) -> str:
        return value.strip()

    def validate_category(self, value: Category) -> Category:
        if not value.is_active:
            raise serializers.ValidationError("This category is archived.")
        return value

    def validate(self, attrs):
        if self.instance is not None:
            attrs.pop("opening_stock", None)
        return attrs


class ProductOptionSerializer(serializers.ModelSerializer):
    """Compact product for pickers (POS, stock movement form)."""

    stock_status = serializers.CharField(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "barcode",
            "name",
            "category",
            "category_name",
            "selling_price",
            "quantity",
            "unit",
            "stock_status",
        ]


class StockAdjustSerializer(serializers.Serializer):
    counted_quantity = serializers.IntegerField(min_value=0, max_value=10_000_000)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
