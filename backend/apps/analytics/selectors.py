"""
Dashboard & report aggregations. Everything is computed in PostgreSQL –
no Python loops over rows.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone

from apps.catalog.models import Category, Product
from apps.inventory.models import StockMovement
from apps.sales.models import Customer, Sale, SaleItem

ZERO = Value(Decimal("0.00"))
MONEY = DecimalField(max_digits=16, decimal_places=2)

RANGES = {"7d": 7, "30d": 30, "90d": 90, "12m": 365}


@dataclass(frozen=True)
class Period:
    key: str
    start: date
    end: date  # inclusive
    previous_start: date
    previous_end: date
    monthly: bool

    @property
    def start_dt(self) -> datetime:
        return timezone.make_aware(datetime.combine(self.start, time.min))

    @property
    def end_dt(self) -> datetime:
        return timezone.make_aware(datetime.combine(self.end + timedelta(days=1), time.min))

    @property
    def previous_start_dt(self) -> datetime:
        return timezone.make_aware(datetime.combine(self.previous_start, time.min))


def resolve_period(key: str) -> Period:
    key = key if key in RANGES else "30d"
    days = RANGES[key]
    end = timezone.localdate()
    start = end - timedelta(days=days - 1)
    if key == "12m":
        start = (end.replace(day=1) - timedelta(days=330)).replace(day=1)
    length = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=length - 1)
    return Period(key, start, end, previous_start, previous_end, monthly=key == "12m")


def _completed_sales(start_dt, end_dt):
    return Sale.objects.filter(status=Sale.Status.COMPLETED, created_at__gte=start_dt, created_at__lt=end_dt)


def _sales_totals(qs) -> dict:
    agg = qs.aggregate(
        revenue=Coalesce(Sum("total"), ZERO, output_field=MONEY),
        net=Coalesce(Sum(F("subtotal") - F("discount_amount")), ZERO, output_field=MONEY),
        cost=Coalesce(Sum("cost_total"), ZERO, output_field=MONEY),
        orders=Count("id"),
    )
    agg["profit"] = agg["net"] - agg["cost"]
    agg["average_order_value"] = (
        (agg["revenue"] / agg["orders"]).quantize(Decimal("0.01")) if agg["orders"] else Decimal("0.00")
    )
    agg["units"] = SaleItem.objects.filter(sale__in=qs).aggregate(u=Coalesce(Sum("quantity"), 0))["u"]
    return agg


def _delta(current, previous) -> float | None:
    if not previous:
        return None if not current else 100.0
    return round(float((Decimal(current) - Decimal(previous)) / Decimal(previous) * 100), 1)


def kpis(period: Period) -> dict:
    current = _sales_totals(_completed_sales(period.start_dt, period.end_dt))
    previous = _sales_totals(_completed_sales(period.previous_start_dt, period.start_dt))
    return {
        key: {"value": current[key], "previous": previous[key], "change": _delta(current[key], previous[key])}
        for key in ("revenue", "profit", "orders", "average_order_value", "units")
    }


def inventory_snapshot() -> dict:
    active = Product.objects.active()
    value_expr = ExpressionWrapper(F("cost_price") * F("quantity"), output_field=MONEY)
    retail_expr = ExpressionWrapper(F("selling_price") * F("quantity"), output_field=MONEY)
    agg = active.aggregate(
        products=Count("id"),
        units=Coalesce(Sum("quantity"), 0),
        stock_value=Coalesce(Sum(value_expr), ZERO, output_field=MONEY),
        retail_value=Coalesce(Sum(retail_expr), ZERO, output_field=MONEY),
        out_of_stock=Count("id", filter=Q(quantity=0)),
        low_stock=Count("id", filter=Q(quantity__gt=0, quantity__lte=F("reorder_level"))),
    )
    agg["in_stock"] = agg["products"] - agg["out_of_stock"] - agg["low_stock"]
    agg["categories"] = Category.objects.filter(is_active=True).count()
    agg["customers"] = Customer.objects.filter(is_active=True).count()
    return agg


def revenue_trend(period: Period) -> list[dict]:
    trunc = TruncMonth("created_at") if period.monthly else TruncDate("created_at")
    rows = (
        _completed_sales(period.start_dt, period.end_dt)
        .annotate(bucket=trunc)
        .values("bucket")
        .annotate(
            revenue=Coalesce(Sum("total"), ZERO, output_field=MONEY),
            profit=Coalesce(
                Sum(F("subtotal") - F("discount_amount") - F("cost_total")), ZERO, output_field=MONEY
            ),
            orders=Count("id"),
        )
        .order_by("bucket")
    )
    by_bucket = {}
    for row in rows:
        bucket = row["bucket"]
        if isinstance(bucket, datetime):
            bucket = timezone.localtime(bucket).date() if timezone.is_aware(bucket) else bucket.date()
        by_bucket[bucket] = row

    series, cursor = [], period.start
    while cursor <= period.end:
        row = by_bucket.get(cursor, {})
        series.append(
            {
                "date": cursor.isoformat(),
                "revenue": row.get("revenue", Decimal("0.00")),
                "profit": row.get("profit", Decimal("0.00")),
                "orders": row.get("orders", 0),
            }
        )
        if period.monthly:
            cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            cursor += timedelta(days=1)
    return series


def _period_items(period: Period):
    return SaleItem.objects.filter(
        sale__status=Sale.Status.COMPLETED,
        sale__created_at__gte=period.start_dt,
        sale__created_at__lt=period.end_dt,
    )


def category_breakdown(period: Period, limit: int = 6) -> list[dict]:
    rows = list(
        _period_items(period)
        .values(
            category_id=F("product__category_id"),
            name=F("product__category__name"),
            color=F("product__category__color"),
        )
        .annotate(revenue=Coalesce(Sum("line_total"), ZERO, output_field=MONEY), units=Sum("quantity"))
        .order_by("-revenue")
    )
    if len(rows) > limit:
        head, tail = rows[: limit - 1], rows[limit - 1 :]
        head.append(
            {
                "category_id": None,
                "name": "Other",
                "color": "#94A3B8",
                "revenue": sum((r["revenue"] for r in tail), Decimal("0.00")),
                "units": sum(r["units"] for r in tail),
            }
        )
        rows = head
    total = sum((r["revenue"] for r in rows), Decimal("0.00"))
    for row in rows:
        row["share"] = round(float(row["revenue"] / total * 100), 1) if total else 0.0
    return rows


def top_products(period: Period, limit: int = 5) -> list[dict]:
    rows = (
        _period_items(period)
        .values("product_id", name=F("product__name"), product_sku=F("product__sku"))
        .annotate(units=Sum("quantity"), revenue=Coalesce(Sum("line_total"), ZERO, output_field=MONEY))
        .order_by("-units", "-revenue")[:limit]
    )
    return [{**row, "sku": row.pop("product_sku")} for row in rows]


def stock_alerts(limit: int = 8) -> list[dict]:
    return list(
        Product.objects.active()
        .filter(quantity__lte=F("reorder_level"))
        .order_by("quantity", "name")
        .values("id", "name", "sku", "quantity", "reorder_level")[:limit]
    )


def recent_sales(limit: int = 6) -> list[dict]:
    rows = Sale.objects.select_related("customer").order_by("-created_at")[:limit]
    return [
        {
            "id": s.id,
            "invoice_number": s.invoice_number,
            "customer_name": s.customer.name if s.customer else "Walk-in customer",
            "total": s.total,
            "status": s.status,
            "payment_method": s.payment_method,
            "created_at": s.created_at,
        }
        for s in rows
    ]


def recent_movements(limit: int = 6) -> list[dict]:
    rows = StockMovement.objects.select_related("product").order_by("-created_at", "-id")[:limit]
    return [
        {
            "id": m.id,
            "product_id": m.product_id,
            "product_name": m.product.name,
            "movement_type": m.movement_type,
            "signed_quantity": m.signed_quantity,
            "created_at": m.created_at,
        }
        for m in rows
    ]


def dashboard(period_key: str) -> dict:
    period = resolve_period(period_key)
    return {
        "range": period.key,
        "period": {"start": period.start, "end": period.end},
        "kpis": kpis(period),
        "inventory": inventory_snapshot(),
        "revenue_trend": revenue_trend(period),
        "category_breakdown": category_breakdown(period),
        "top_products": top_products(period),
        "stock_alerts": stock_alerts(),
        "recent_sales": recent_sales(),
        "recent_movements": recent_movements(),
    }
