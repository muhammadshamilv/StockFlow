from decimal import Decimal

from django.db.models import Count, DecimalField, Max, Q, Sum, Value
from django.db.models.functions import Coalesce

from .models import Customer, Sale

_completed = Q(sales__status=Sale.Status.COMPLETED)


def customer_queryset():
    return Customer.objects.annotate(
        orders_count=Count("sales", filter=_completed, distinct=True),
        total_spent=Coalesce(
            Sum("sales__total", filter=_completed),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        ),
        last_purchase_at=Max("sales__created_at", filter=_completed),
    )


def sale_list_queryset():
    return (
        Sale.objects.select_related("customer", "created_by")
        .annotate(items_count=Coalesce(Sum("items__quantity"), 0))
        .order_by("-created_at", "-id")
    )


def sale_detail_queryset():
    return Sale.objects.select_related("customer", "created_by", "cancelled_by").prefetch_related("items")


def sales_summary(queryset) -> dict:
    completed = queryset.filter(status=Sale.Status.COMPLETED)
    agg = completed.aggregate(
        revenue=Coalesce(Sum("total"), Value(Decimal("0.00")), output_field=DecimalField()),
        tax=Coalesce(Sum("tax_amount"), Value(Decimal("0.00")), output_field=DecimalField()),
        orders=Count("id"),
    )
    agg["cancelled"] = queryset.filter(status=Sale.Status.CANCELLED).count()
    agg["average_order_value"] = (
        (agg["revenue"] / agg["orders"]).quantize(Decimal("0.01")) if agg["orders"] else Decimal("0.00")
    )
    return agg
