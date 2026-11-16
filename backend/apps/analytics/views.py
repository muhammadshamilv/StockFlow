import csv
from datetime import date

from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import BusinessRuleViolation
from apps.core.permissions import IsManagerOrAdmin
from apps.sales.models import Sale

from . import selectors
from .serializers import DashboardSerializer


class DashboardView(APIView):
    @extend_schema(
        tags=["Analytics"],
        parameters=[OpenApiParameter("range", str, enum=list(selectors.RANGES), default="30d")],
        responses=DashboardSerializer,
        summary="Everything the dashboard needs in one request",
    )
    def get(self, request):
        data = selectors.dashboard(request.query_params.get("range", "30d"))
        if not request.user.is_manager_or_above:
            # Staff see sales volume but not profit or stock valuation
            data["kpis"]["profit"] = {"value": 0, "previous": 0, "change": None}
            data["inventory"]["stock_value"] = 0
        return Response(DashboardSerializer(data).data)


class _Echo:
    def write(self, value):
        return value


class SalesReportView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(
        tags=["Analytics"],
        parameters=[
            OpenApiParameter("date_from", date, description="Defaults to the 1st of this month"),
            OpenApiParameter("date_to", date, description="Defaults to today"),
        ],
        responses={(200, "text/csv"): OpenApiResponse(description="Line-item sales report")},
        summary="Download sales report (CSV)",
    )
    def get(self, request):
        today = timezone.localdate()
        date_from = parse_date(request.query_params.get("date_from", "")) or today.replace(day=1)
        date_to = parse_date(request.query_params.get("date_to", "")) or today
        if date_from > date_to:
            raise BusinessRuleViolation("date_from must be before date_to.")

        sales = (
            Sale.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)
            .select_related("customer", "created_by")
            .prefetch_related("items")
            .order_by("created_at")
        )
        writer = csv.writer(_Echo())
        header = [
            "invoice",
            "date",
            "status",
            "customer",
            "payment",
            "sku",
            "item",
            "qty",
            "unit_price",
            "line_total",
            "sale_subtotal",
            "discount",
            "tax",
            "sale_total",
            "cashier",
        ]

        def rows():
            yield writer.writerow(header)
            for sale in sales.iterator(chunk_size=200):
                for item in sale.items.all():
                    yield writer.writerow(
                        [
                            sale.invoice_number,
                            timezone.localtime(sale.created_at).strftime("%Y-%m-%d %H:%M"),
                            sale.status,
                            sale.customer.name if sale.customer else "Walk-in",
                            sale.payment_method,
                            item.sku,
                            item.product_name,
                            item.quantity,
                            item.unit_price,
                            item.line_total,
                            sale.subtotal,
                            sale.discount_amount,
                            sale.tax_amount,
                            sale.total,
                            sale.created_by.full_name if sale.created_by else "",
                        ]
                    )

        response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="sales-{date_from}-to-{date_to}.csv"'
        return response
