"""Turn domain events into in-app notifications."""

from django.dispatch import receiver

from apps.accounts.signals import user_registered
from apps.catalog.models import Product
from apps.inventory.models import StockMovement
from apps.inventory.signals import stock_status_changed

from .models import Notification
from .services import notify_roles

MANAGERS = ("ADMIN", "MANAGER")


@receiver(user_registered)
def on_user_registered(sender, user, **kwargs):
    if user.role == "ADMIN":  # first account – nobody to notify
        return
    notify_roles(
        roles=("ADMIN",),
        kind=Notification.Kind.NEW_USER,
        level=Notification.Level.INFO,
        title="New team member registered",
        message=f"{user.full_name} (@{user.username}) joined as Staff. Review their role.",
        link="/team",
    )


@receiver(stock_status_changed)
def on_stock_status_changed(
    sender, product: Product, movement: StockMovement, previous_status: str, new_status: str, **kwargs
):
    link = f"/products/{product.pk}"
    Status = Product.StockStatus
    if new_status == Status.OUT_OF_STOCK:
        notify_roles(
            roles=MANAGERS,
            kind=Notification.Kind.OUT_OF_STOCK,
            level=Notification.Level.CRITICAL,
            title=f"Out of stock: {product.name}",
            message=f"{product.sku} has 0 units left. Restock to keep selling.",
            link=link,
        )
    elif new_status == Status.LOW_STOCK and previous_status == Status.IN_STOCK:
        notify_roles(
            roles=MANAGERS,
            kind=Notification.Kind.LOW_STOCK,
            level=Notification.Level.WARNING,
            title=f"Low stock: {product.name}",
            message=f"Only {product.quantity} left (reorder level {product.reorder_level}).",
            link=link,
        )
    elif (
        new_status == Status.IN_STOCK
        and previous_status == Status.OUT_OF_STOCK
        # A brand-new product receiving its opening stock is not a "restock"
        and StockMovement.objects.filter(product=product).exclude(pk=movement.pk).exists()
    ):
        notify_roles(
            roles=MANAGERS,
            kind=Notification.Kind.RESTOCKED,
            level=Notification.Level.SUCCESS,
            title=f"Back in stock: {product.name}",
            message=f"{product.quantity} units available again.",
            link=link,
        )
