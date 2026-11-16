"""CSV export for products (respects the list's filters and search)."""

import csv

from django.http import StreamingHttpResponse
from django.utils import timezone

COLUMNS = [
    "sku",
    "barcode",
    "name",
    "category",
    "unit",
    "cost_price",
    "selling_price",
    "quantity",
    "reorder_level",
    "stock_status",
    "is_active",
]


class _Echo:
    def write(self, value):
        return value


def export_products_csv(queryset) -> StreamingHttpResponse:
    writer = csv.writer(_Echo())

    def rows():
        yield writer.writerow(COLUMNS)
        for p in queryset.iterator(chunk_size=500):
            yield writer.writerow(
                [
                    p.sku,
                    p.barcode,
                    p.name,
                    p.category.name,
                    p.unit,
                    p.cost_price,
                    p.selling_price,
                    p.quantity,
                    p.reorder_level,
                    p.stock_status,
                    "yes" if p.is_active else "no",
                ]
            )

    response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = (
        f'attachment; filename="stockflow-products-{timezone.localdate():%Y%m%d}.csv"'
    )
    return response
