"""
Sales business logic: atomic multi-item checkout and cancellation.
"""

from collections import OrderedDict
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Product
from apps.core.exceptions import BusinessRuleViolation, ConflictError
from apps.core.utils import money
from apps.inventory import services as inventory
from apps.inventory.models import StockMovement

from .models import Customer, DocumentSequence, Sale, SaleItem


def next_invoice_number() -> str:
    """Must be called inside a transaction – the counter row stays locked until commit."""
    prefix = settings.STOCKFLOW["INVOICE_PREFIX"]
    year = timezone.localdate().year
    DocumentSequence.objects.get_or_create(key=prefix, year=year)
    seq = DocumentSequence.objects.select_for_update().get(key=prefix, year=year)
    seq.last_value += 1
    seq.save(update_fields=["last_value"])
    return f"{prefix}-{year}-{seq.last_value:05d}"


def _merge_lines(items: list[dict]) -> "OrderedDict[int, dict]":
    """Collapse duplicate products into one line (POS may add the same item twice)."""
    merged: OrderedDict[int, dict] = OrderedDict()
    for item in items:
        pk = item["product"].pk
        if pk in merged:
            merged[pk]["quantity"] += item["quantity"]
        else:
            merged[pk] = {"quantity": item["quantity"], "unit_price": item.get("unit_price")}
    return merged


@transaction.atomic
def create_sale(
    *,
    user,
    items: list[dict],
    customer: Customer | None = None,
    payment_method: str = Sale.PaymentMethod.CASH,
    discount_amount: Decimal = Decimal("0"),
    tax_rate: Decimal | None = None,
    amount_paid: Decimal | None = None,
    notes: str = "",
) -> Sale:
    if not items:
        raise BusinessRuleViolation("A sale needs at least one item.")
    if tax_rate is None:
        tax_rate = Decimal(str(settings.STOCKFLOW["DEFAULT_TAX_RATE"]))

    lines = _merge_lines(items)
    # Lock rows in a stable order to avoid deadlocks between concurrent checkouts
    products = {
        p.pk: p for p in Product.objects.select_for_update().filter(pk__in=sorted(lines)).order_by("pk")
    }

    subtotal = cost_total = Decimal("0")
    prepared = []
    for pk, line in lines.items():
        product = products[pk]
        if not product.is_active:
            raise BusinessRuleViolation(f"“{product.name}” is archived and cannot be sold.")
        if line["quantity"] > product.quantity:
            raise inventory.InsufficientStock(
                f"Only {product.quantity} {product.get_unit_display().lower()} of “{product.name}” available."
            )
        unit_price = line["unit_price"]
        if unit_price is None:
            unit_price = product.selling_price
        elif unit_price != product.selling_price and not user.is_manager_or_above:
            raise BusinessRuleViolation("Only managers can override selling prices.", code="price_override")

        line_total = money(unit_price * line["quantity"])
        subtotal += line_total
        cost_total += money(product.cost_price * line["quantity"])
        prepared.append((product, line["quantity"], money(unit_price), line_total))

    discount_amount = money(discount_amount)
    if discount_amount > subtotal:
        raise BusinessRuleViolation("Discount cannot exceed the subtotal.", code="discount_too_high")
    taxable = subtotal - discount_amount
    tax_amount = money(taxable * Decimal(tax_rate) / 100)
    total = money(taxable + tax_amount)
    if amount_paid is not None and money(amount_paid) < total:
        raise BusinessRuleViolation("Amount paid is less than the total.", code="underpaid")

    sale = Sale.objects.create(
        invoice_number=next_invoice_number(),
        customer=customer,
        payment_method=payment_method,
        subtotal=money(subtotal),
        discount_amount=discount_amount,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total=total,
        cost_total=money(cost_total),
        amount_paid=money(amount_paid) if amount_paid is not None else None,
        notes=notes,
        created_by=user,
    )
    SaleItem.objects.bulk_create(
        [
            SaleItem(
                sale=sale,
                product=product,
                product_name=product.name,
                sku=product.sku,
                quantity=quantity,
                unit_price=unit_price,
                unit_cost=product.cost_price,
                line_total=line_total,
            )
            for product, quantity, unit_price, line_total in prepared
        ]
    )
    for product, quantity, _, _ in prepared:
        inventory.stock_out(
            product=product,
            quantity=quantity,
            user=user,
            reference=sale.invoice_number,
            note=f"Sale {sale.invoice_number}",
            movement_type=StockMovement.Type.SALE,
        )

    return sale


@transaction.atomic
def cancel_sale(*, sale: Sale, user, reason: str) -> Sale:
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if sale.status == Sale.Status.CANCELLED:
        raise ConflictError("This sale is already cancelled.")

    for item in sale.items.select_related("product").order_by("product_id"):
        inventory.stock_return(
            product=item.product,
            quantity=item.quantity,
            user=user,
            reference=sale.invoice_number,
            note=f"Cancelled {sale.invoice_number}",
        )

    sale.status = Sale.Status.CANCELLED
    sale.cancelled_at = timezone.now()
    sale.cancelled_by = user
    sale.cancel_reason = reason
    sale.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancel_reason", "updated_at"])
    return sale
