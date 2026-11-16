from decimal import Decimal

from rest_framework import serializers

from .models import Category, Product, Supplier

MAX_IMAGE_BYTES = 3 * 1024 * 1024


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


class SupplierSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "contact_person",
            "email",
            "phone",
            "address",
            "tax_id",
            "notes",
            "is_active",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        value = value.strip()
        _ci_unique(Supplier, "name", value, self.instance, "A supplier with this name already exists.")
        return value


class SupplierOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), allow_null=True, required=False
    )
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    stock_status = serializers.CharField(read_only=True)
    stock_status_display = serializers.SerializerMethodField()
    margin_percent = serializers.DecimalField(max_digits=6, decimal_places=1, read_only=True, allow_null=True)
    stock_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    sku = serializers.CharField(max_length=40, required=False, allow_blank=True)
    opening_stock = serializers.IntegerField(
        write_only=True, required=False, min_value=0, max_value=1_000_000, default=0
    )
    remove_image = serializers.BooleanField(write_only=True, required=False, default=False)

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
            "supplier",
            "supplier_name",
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
            "image",
            "is_active",
            "opening_stock",
            "remove_image",
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

    def validate_image(self, value):
        if value and value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError("Image must be smaller than 3 MB.")
        return value

    def validate_category(self, value: Category) -> Category:
        if not value.is_active:
            raise serializers.ValidationError("This category is archived.")
        return value

    def validate(self, attrs):
        if self.instance is not None:
            attrs.pop("opening_stock", None)
        cost = attrs.get("cost_price", getattr(self.instance, "cost_price", Decimal("0")))
        price = attrs.get("selling_price", getattr(self.instance, "selling_price", None))
        if price is not None and cost is not None and price < cost:
            # Allowed (clearance sales happen) but surfaced to the UI as a warning flag
            self.context["below_cost_warning"] = True
        return attrs


class ProductOptionSerializer(serializers.ModelSerializer):
    """Compact product for pickers (POS, stock movement form)."""

    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "name",
            "selling_price",
            "cost_price",
            "quantity",
            "unit",
            "stock_status",
            "image",
        ]


class StockAdjustSerializer(serializers.Serializer):
    counted_quantity = serializers.IntegerField(min_value=0, max_value=10_000_000)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class ProductImportSerializer(serializers.Serializer):
    file = serializers.FileField()


class ProductImportRowSerializer(serializers.Serializer):
    """Validates & coerces one CSV row."""

    sku = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    barcode = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.CharField(max_length=100)
    supplier = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    unit = serializers.ChoiceField(choices=Product.Unit.choices, required=False, default=Product.Unit.PIECE)
    cost_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False, default=0
    )
    selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    quantity = serializers.IntegerField(min_value=0, required=False, allow_null=True, default=None)
    reorder_level = serializers.IntegerField(min_value=0, required=False, default=10)

    def to_internal_value(self, data):
        # CSV gives empty strings for missing optional numbers
        cleaned = {k: v for k, v in data.items() if v not in ("", None)}
        return super().to_internal_value(cleaned)


class ProductImportResultSerializer(serializers.Serializer):
    created = serializers.IntegerField()
    updated = serializers.IntegerField()
    skipped = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField())
