"""Read-side query builders for the catalog (keeps views free of ORM details)."""

from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum, Value
from django.db.models.functions import Coalesce

from .models import Category, Product, Supplier

_stock_value_expr = ExpressionWrapper(
    F("products__cost_price") * F("products__quantity"),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)


def category_queryset():
    return Category.objects.annotate(
        product_count=Count("products", filter=Q(products__is_active=True), distinct=True),
        stock_units=Coalesce(Sum("products__quantity", filter=Q(products__is_active=True)), 0),
        stock_value=Coalesce(
            Sum(_stock_value_expr, filter=Q(products__is_active=True)),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        ),
    )


def supplier_queryset():
    return Supplier.objects.annotate(
        product_count=Count("products", filter=Q(products__is_active=True), distinct=True),
    )


def product_queryset():
    return Product.objects.select_related("category", "supplier")


def product_status_summary() -> dict:
    qs = Product.objects.active()
    return {
        "total": qs.count(),
        "in_stock": qs.in_stock().count(),
        "low_stock": qs.low_stock().count(),
        "out_of_stock": qs.out_of_stock().count(),
        "archived": Product.objects.filter(is_active=False).count(),
    }
