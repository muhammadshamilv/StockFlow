"""Signal handlers: persist domain activity and raise notifications."""

from django.dispatch import receiver

from apps.catalog.models import Product
from apps.core.signals import activity
from apps.inventory.models import StockMovement
from apps.inventory.signals import stock_status_changed

from .models import Notification
from .services import notify_roles, record_activity

MANAGERS = ("ADMIN", "MANAGER")


@receiver(activity)
def on_activity(sender, actor, verb, target=None, metadata=None, **kwargs):
    record_activity(actor=actor, verb=verb, target=target, metadata=metadata)

    if verb == "auth.registered" and metadata and metadata.get("role") != "ADMIN":
        notify_roles(
            roles=("ADMIN",),
            kind=Notification.Kind.NEW_USER,
            level=Notification.Level.INFO,
            title="New team member registered",
            message=f"{target.full_name} (@{target.username}) joined as Staff. Review their role.",
            link="/users",
        )


@receiver(stock_status_changed)
def on_stock_status_changed(
    sender, product: Product, movement: StockMovement, previous_status: str, new_status: str, **kwargs
):
    # A brand-new product receiving its opening stock is not a "restock"
    is_first_movement = not StockMovement.objects.filter(product=product).exclude(pk=movement.pk).exists()
    link = f"/products/{product.pk}"
    if new_status == Product.StockStatus.OUT_OF_STOCK:
        notify_roles(
            roles=MANAGERS,
            kind=Notification.Kind.OUT_OF_STOCK,
            level=Notification.Level.CRITICAL,
            title=f"Out of stock: {product.name}",
            message=f"{product.sku} has 0 units left. Restock to keep selling.",
            link=link,
        )
    elif new_status == Product.StockStatus.LOW_STOCK and previous_status == Product.StockStatus.IN_STOCK:
        notify_roles(
            roles=MANAGERS,
            kind=Notification.Kind.LOW_STOCK,
            level=Notification.Level.WARNING,
            title=f"Low stock: {product.name}",
            message=f"Only {product.quantity} left (reorder level {product.reorder_level}).",
            link=link,
        )
    elif (
        new_status == Product.StockStatus.IN_STOCK
        and previous_status == Product.StockStatus.OUT_OF_STOCK
        and not is_first_movement
    ):
        notify_roles(
            roles=MANAGERS,
            kind=Notification.Kind.RESTOCKED,
            level=Notification.Level.SUCCESS,
            title=f"Back in stock: {product.name}",
            message=f"{product.quantity} units available again.",
            link=link,
        )
