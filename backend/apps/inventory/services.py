"""
The ONLY place where Product.quantity changes.

Every function:
  * runs inside a DB transaction,
  * locks the product row (SELECT ... FOR UPDATE) to prevent race conditions,
  * writes an immutable StockMovement,
  * fires `stock_status_changed` after commit when the product crosses a threshold.
"""

from decimal import Decimal

from django.db import transaction

from apps.catalog.models import Product
from apps.core.exceptions import BusinessRuleViolation
from apps.core.utils import money

from .models import StockMovement
from .signals import stock_status_changed

Type = StockMovement.Type


class InsufficientStock(BusinessRuleViolation):
    default_code = "insufficient_stock"


def _lock(product: Product | int) -> Product:
    pk = product.pk if isinstance(product, Product) else product
    return Product.objects.select_for_update().get(pk=pk)


def _apply(
    *,
    product: Product | int,
    movement_type: str,
    delta: int,
    user=None,
    unit_cost: Decimal | None = None,
    reference: str = "",
    note: str = "",
) -> StockMovement:
    if delta == 0:
        raise BusinessRuleViolation("Quantity must not be zero.", code="zero_quantity")

    with transaction.atomic():
        locked = _lock(product)
        before = locked.quantity
        after = before + delta
        if after < 0:
            raise InsufficientStock(
                f"Only {before} {locked.get_unit_display().lower()} of “{locked.name}” in stock."
            )

        previous_status = locked.stock_status
        update_fields = ["quantity", "updated_at"]

        # Weighted-average costing on purchases
        if movement_type == Type.IN and unit_cost is not None and delta > 0:
            total_units = before + delta
            locked.cost_price = money((locked.cost_price * before + unit_cost * delta) / total_units)
            update_fields.append("cost_price")

        locked.quantity = after
        locked.save(update_fields=update_fields)

        movement = StockMovement.objects.create(
            product=locked,
            movement_type=movement_type,
            quantity=abs(delta),
            quantity_before=before,
            quantity_after=after,
            unit_cost=unit_cost,
            reference=reference,
            note=note,
            created_by=user,
        )

        new_status = locked.stock_status
        if new_status != previous_status:
            transaction.on_commit(
                lambda: stock_status_changed.send(
                    sender=Product,
                    product=locked,
                    movement=movement,
                    previous_status=previous_status,
                    new_status=new_status,
                )
            )

        # Product instance passed by the caller should reflect the new state
        if isinstance(product, Product):
            product.quantity = locked.quantity
            product.cost_price = locked.cost_price
        return movement


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def stock_in(
    *,
    product,
    quantity: int,
    user=None,
    unit_cost: Decimal | None = None,
    reference: str = "",
    note: str = "",
) -> StockMovement:
    return _apply(
        product=product,
        movement_type=Type.IN,
        delta=quantity,
        user=user,
        unit_cost=unit_cost,
        reference=reference,
        note=note,
    )


def stock_out(
    *, product, quantity: int, user=None, reference: str = "", note: str = "", movement_type: str = Type.OUT
) -> StockMovement:
    if movement_type not in (Type.OUT, Type.SALE):
        raise ValueError("stock_out only handles OUT or SALE movements.")
    return _apply(
        product=product,
        movement_type=movement_type,
        delta=-quantity,
        user=user,
        reference=reference,
        note=note,
    )


def stock_return(*, product, quantity: int, user=None, reference: str = "", note: str = "") -> StockMovement:
    return _apply(
        product=product, movement_type=Type.RETURN, delta=quantity, user=user, reference=reference, note=note
    )


def adjust_to(*, product, counted_quantity: int, user=None, note: str = "") -> StockMovement:
    """Stock-take: set the quantity to what was physically counted."""
    if counted_quantity < 0:
        raise BusinessRuleViolation("Counted quantity cannot be negative.")
    with transaction.atomic():
        current = _lock(product).quantity
        delta = counted_quantity - current
        if delta == 0:
            raise BusinessRuleViolation("Counted quantity matches current stock – nothing to adjust.")
        movement = _apply(
            product=product,
            movement_type=Type.ADJUSTMENT,
            delta=delta,
            user=user,
            note=note or "Stock count adjustment",
        )
    return movement
