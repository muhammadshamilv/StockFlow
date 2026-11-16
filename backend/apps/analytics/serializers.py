"""Response shapes for the analytics endpoints (used for OpenAPI docs + output)."""

from rest_framework import serializers

M = {"max_digits": 16, "decimal_places": 2}


class MetricSerializer(serializers.Serializer):
    value = serializers.DecimalField(**M)
    previous = serializers.DecimalField(**M)
    change = serializers.FloatField(allow_null=True)


class KpisSerializer(serializers.Serializer):
    revenue = MetricSerializer()
    profit = MetricSerializer()
    orders = MetricSerializer()
    average_order_value = MetricSerializer()
    units = MetricSerializer()


class InventorySnapshotSerializer(serializers.Serializer):
    products = serializers.IntegerField()
    units = serializers.IntegerField()
    stock_value = serializers.DecimalField(**M)
    retail_value = serializers.DecimalField(**M)
    in_stock = serializers.IntegerField()
    low_stock = serializers.IntegerField()
    out_of_stock = serializers.IntegerField()
    categories = serializers.IntegerField()
    customers = serializers.IntegerField()


class TrendPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    revenue = serializers.DecimalField(**M)
    profit = serializers.DecimalField(**M)
    orders = serializers.IntegerField()


class CategoryShareSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()
    color = serializers.CharField()
    revenue = serializers.DecimalField(**M)
    units = serializers.IntegerField()
    share = serializers.FloatField()


class TopProductSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    name = serializers.CharField()
    sku = serializers.CharField()
    units = serializers.IntegerField()
    revenue = serializers.DecimalField(**M)


class StockAlertSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    sku = serializers.CharField()
    quantity = serializers.IntegerField()
    reorder_level = serializers.IntegerField()


class RecentSaleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    invoice_number = serializers.CharField()
    customer_name = serializers.CharField()
    total = serializers.DecimalField(**M)
    status = serializers.CharField()
    payment_method = serializers.CharField()
    created_at = serializers.DateTimeField()


class RecentMovementSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    movement_type = serializers.CharField()
    signed_quantity = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class PeriodSerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()


class DashboardSerializer(serializers.Serializer):
    range = serializers.ChoiceField(choices=["7d", "30d", "90d", "12m"])
    period = PeriodSerializer()
    kpis = KpisSerializer()
    inventory = InventorySnapshotSerializer()
    revenue_trend = TrendPointSerializer(many=True)
    category_breakdown = CategoryShareSerializer(many=True)
    top_products = TopProductSerializer(many=True)
    stock_alerts = StockAlertSerializer(many=True)
    recent_sales = RecentSaleSerializer(many=True)
    recent_movements = RecentMovementSerializer(many=True)
