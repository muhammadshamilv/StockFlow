"""CSV import / export for products."""

import csv
import io

from django.conf import settings
from django.db import transaction
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.utils.text import slugify

from apps.core.exceptions import BusinessRuleViolation
from apps.core.signals import emit_activity

from . import services
from .models import Category, Product, Supplier
from .serializers import ProductImportRowSerializer

EXPORT_COLUMNS = [
    "sku",
    "barcode",
    "name",
    "description",
    "category",
    "supplier",
    "unit",
    "cost_price",
    "selling_price",
    "quantity",
    "reorder_level",
    "stock_status",
    "is_active",
]
IMPORT_COLUMNS = EXPORT_COLUMNS[:11]
REQUIRED_COLUMNS = {"name", "category", "selling_price"}
MAX_ROWS = 5000


class _Echo:
    def write(self, value):
        return value


def export_products_csv(queryset) -> StreamingHttpResponse:
    writer = csv.writer(_Echo())

    def rows():
        yield writer.writerow(EXPORT_COLUMNS)
        for p in queryset.iterator(chunk_size=500):
            yield writer.writerow(
                [
                    p.sku,
                    p.barcode,
                    p.name,
                    p.description,
                    p.category.name,
                    p.supplier.name if p.supplier else "",
                    p.unit,
                    p.cost_price,
                    p.selling_price,
                    p.quantity,
                    p.reorder_level,
                    p.stock_status,
                    "yes" if p.is_active else "no",
                ]
            )

    filename = f"stockflow-products-{timezone.localdate():%Y%m%d}.csv"
    response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def import_template_csv() -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(IMPORT_COLUMNS)
    writer.writerow(
        [
            "",
            "8901234567890",
            "Wireless Mouse",
            "2.4GHz, USB receiver",
            "Electronics",
            "TechSource Pvt Ltd",
            "pcs",
            "350.00",
            "599.00",
            "40",
            "10",
        ]
    )
    return buffer.getvalue()


def _resolve_category(name: str, user) -> Category:
    category = Category.objects.filter(name__iexact=name.strip()).first()
    if category:
        return category
    return services.create_category(user=user, name=name.strip(), description="Created by CSV import")


def _resolve_supplier(name: str) -> Supplier | None:
    if not name.strip():
        return None
    supplier = Supplier.objects.filter(name__iexact=name.strip()).first()
    return supplier or Supplier.objects.create(name=name.strip())


def import_products_csv(*, file, user) -> dict:
    """
    Upsert products by SKU. Each row is processed in its own savepoint so one
    bad row never blocks the rest. Quantity changes are written as ADJUSTMENT
    movements, keeping the stock ledger complete.
    """
    from apps.inventory.services import adjust_to

    if file.size > settings.STOCKFLOW["CSV_IMPORT_MAX_BYTES"]:
        raise BusinessRuleViolation("CSV file is too large (max 2 MB).")
    try:
        text = file.read().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise BusinessRuleViolation("CSV must be UTF-8 encoded.") from exc

    reader = csv.DictReader(io.StringIO(text))
    headers = {(h or "").strip().lower() for h in (reader.fieldnames or [])}
    missing = REQUIRED_COLUMNS - headers
    if missing:
        raise BusinessRuleViolation(f"Missing required column(s): {', '.join(sorted(missing))}.")

    created = updated = skipped = 0
    errors: list[dict] = []

    for index, raw in enumerate(reader, start=2):  # row 1 is the header
        if index - 1 > MAX_ROWS:
            errors.append({"row": index, "message": f"Stopped: more than {MAX_ROWS} rows."})
            break
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        if not any(row.values()):
            skipped += 1
            continue

        serializer = ProductImportRowSerializer(data=row)
        if not serializer.is_valid():
            field, messages = next(iter(serializer.errors.items()))
            errors.append({"row": index, "message": f"{field}: {messages[0]}"})
            continue
        data = serializer.validated_data

        try:
            with transaction.atomic():
                category = _resolve_category(data["category"], user)
                supplier = _resolve_supplier(data["supplier"])
                sku = data["sku"].upper()
                quantity = data["quantity"]
                fields = {
                    "barcode": data["barcode"],
                    "name": data["name"],
                    "description": data["description"],
                    "category": category,
                    "supplier": supplier,
                    "unit": data["unit"],
                    "cost_price": data["cost_price"],
                    "selling_price": data["selling_price"],
                    "reorder_level": data["reorder_level"],
                }
                existing = Product.objects.filter(sku__iexact=sku).first() if sku else None
                if existing:
                    for key, value in fields.items():
                        setattr(existing, key, value)
                    existing.save()
                    if quantity is not None and quantity != existing.quantity:
                        adjust_to(product=existing, counted_quantity=quantity, user=user, note="CSV import")
                    updated += 1
                else:
                    services.create_product(user=user, sku=sku, opening_stock=quantity or 0, **fields)
                    created += 1
        except Exception as exc:
            detail = getattr(exc, "detail", None) or str(exc)
            errors.append({"row": index, "message": str(detail)})

    emit_activity(
        actor=user,
        verb="product.imported",
        metadata={"created": created, "updated": updated, "errors": len(errors), "file": slugify(file.name)},
    )
    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}
