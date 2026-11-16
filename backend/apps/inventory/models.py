from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.catalog.models import Product, Supplier


class StockMovement(models.Model):
    """
    Immutable stock ledger. Every change to Product.quantity creates exactly
    one row here, so the current quantity can always be audited.
    """

    class Type(models.TextChoices):
        IN = "IN", "Stock in"
        OUT = "OUT", "Stock out"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        SALE = "SALE", "Sale"
        RETURN = "RETURN", "Return"

    INBOUND_TYPES = (Type.IN, Type.RETURN)

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=12, choices=Type.choices, db_index=True)
    quantity = models.PositiveIntegerField(help_text="Absolute number of units moved.")
    quantity_before = models.PositiveIntegerField()
    quantity_after = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="movements"
    )
    reference = models.CharField(max_length=60, blank=True, db_index=True)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["product", "-created_at"])]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="movement_quantity_gt_0"),
        ]

    def __str__(self) -> str:
        return f"{self.get_movement_type_display()} · {self.product.name} · {self.quantity}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Stock movements are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Stock movements are immutable.")

    @property
    def direction(self) -> str:
        return "in" if self.quantity_after >= self.quantity_before else "out"

    @property
    def signed_quantity(self) -> int:
        return self.quantity_after - self.quantity_before
