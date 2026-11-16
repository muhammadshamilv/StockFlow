from decimal import Decimal

from django.conf import settings
from rest_framework import serializers

from apps.catalog.models import Product

from .models import Customer, Sale, SaleItem


class CustomerSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    last_purchase_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "address",
            "tax_id",
            "notes",
            "is_active",
            "orders_count",
            "total_spent",
            "last_purchase_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        return value.strip()


class CustomerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "phone", "email"]


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "sku", "quantity", "unit_price", "line_total"]


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    items_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_number",
            "customer",
            "customer_name",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "items_count",
            "total",
            "created_by_name",
            "created_at",
        ]

    def get_customer_name(self, obj) -> str:
        return obj.customer.name if obj.customer else "Walk-in customer"

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.full_name if obj.created_by else None


class SaleDetailSerializer(SaleListSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_detail = CustomerOptionSerializer(source="customer", read_only=True)
    net_revenue = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    gross_profit = serializers.SerializerMethodField()
    change_due = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, allow_null=True)
    cancelled_by_name = serializers.SerializerMethodField()

    class Meta(SaleListSerializer.Meta):
        fields = [
            *[f for f in SaleListSerializer.Meta.fields if f != "items_count"],
            "customer_detail",
            "items",
            "subtotal",
            "discount_amount",
            "tax_rate",
            "tax_amount",
            "net_revenue",
            "cost_total",
            "gross_profit",
            "amount_paid",
            "change_due",
            "notes",
            "cancelled_at",
            "cancelled_by_name",
            "cancel_reason",
        ]

    def get_gross_profit(self, obj) -> Decimal | None:
        """Hidden from STAFF – margins are manager information."""
        user = self.context.get("request").user if self.context.get("request") else None
        if user is not None and not user.is_manager_or_above:
            return None
        return obj.gross_profit

    def get_cancelled_by_name(self, obj) -> str | None:
        return obj.cancelled_by.full_name if obj.cancelled_by else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and not request.user.is_manager_or_above:
            data["cost_total"] = None
        return data


class SaleItemInputSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1, max_value=100_000)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True
    )


class SaleCreateSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.filter(is_active=True), required=False, allow_null=True
    )
    items = SaleItemInputSerializer(many=True, allow_empty=False, max_length=100)
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices, default=Sale.PaymentMethod.CASH
    )
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=0, default=Decimal("0")
    )
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100, required=False, allow_null=True
    )
    amount_paid = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")

    def validate_tax_rate(self, value):
        return Decimal(str(settings.STOCKFLOW["DEFAULT_TAX_RATE"])) if value is None else value


class SaleCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, min_length=3)


class SalesSummarySerializer(serializers.Serializer):
    revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    tax = serializers.DecimalField(max_digits=14, decimal_places=2)
    orders = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    average_order_value = serializers.DecimalField(max_digits=14, decimal_places=2)
