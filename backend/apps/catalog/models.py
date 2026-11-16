from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower

from apps.core.models import TimeStampedModel

hex_color = RegexValidator(r"^#[0-9a-fA-F]{6}$", "Use a hex colour like #3B82F6.")


class Category(TimeStampedModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#3B82F6", validators=[hex_color])
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"
        constraints = [models.UniqueConstraint(Lower("name"), name="category_name_ci_unique")]

    def __str__(self) -> str:
        return self.name


class ProductQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_active=True)

    def out_of_stock(self):
        return self.filter(quantity=0)

    def low_stock(self):
        return self.filter(quantity__gt=0, quantity__lte=F("reorder_level"))

    def in_stock(self):
        return self.filter(quantity__gt=F("reorder_level"))


class Product(TimeStampedModel):
    class Unit(models.TextChoices):
        PIECE = "pcs", "Pieces"
        BOX = "box", "Boxes"
        KG = "kg", "Kilograms"
        GRAM = "g", "Grams"
        LITRE = "l", "Litres"
        ML = "ml", "Millilitres"
        METRE = "m", "Metres"
        PACK = "pack", "Packs"

    class StockStatus(models.TextChoices):
        IN_STOCK = "in_stock", "In stock"
        LOW_STOCK = "low_stock", "Low stock"
        OUT_OF_STOCK = "out_of_stock", "Out of stock"

    sku = models.CharField("SKU", max_length=40, unique=True)
    barcode = models.CharField(max_length=64, blank=True, db_index=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    unit = models.CharField(max_length=8, choices=Unit.choices, default=Unit.PIECE)
    cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    # Never edit `quantity` directly – always go through inventory.services
    quantity = models.PositiveIntegerField(default=0, editable=False)
    reorder_level = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["quantity"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=0), name="product_quantity_gte_0"),
            models.CheckConstraint(condition=Q(selling_price__gte=0), name="product_selling_price_gte_0"),
            models.CheckConstraint(condition=Q(cost_price__gte=0), name="product_cost_price_gte_0"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.sku})"

    @property
    def stock_status(self) -> str:
        if self.quantity == 0:
            return self.StockStatus.OUT_OF_STOCK
        if self.quantity <= self.reorder_level:
            return self.StockStatus.LOW_STOCK
        return self.StockStatus.IN_STOCK

    @property
    def margin_percent(self) -> Decimal | None:
        if not self.selling_price:
            return None
        return ((self.selling_price - self.cost_price) / self.selling_price * 100).quantize(Decimal("0.1"))

    @property
    def stock_value(self) -> Decimal:
        return (self.cost_price * self.quantity).quantize(Decimal("0.01"))
