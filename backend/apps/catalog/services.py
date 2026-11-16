"""Write-side business logic for categories, suppliers and products."""

import re

from django.db import transaction
from django.utils.text import slugify

from apps.core.signals import emit_activity

from .models import Category, Product, Supplier


# --------------------------------------------------------------------------- #
# Categories & suppliers
# --------------------------------------------------------------------------- #
def _unique_slug(name: str, *, exclude_pk: int | None = None) -> str:
    base = slugify(name)[:100] or "category"
    slug, n = base, 2
    qs = Category.objects.all()
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=slug).exists():
        slug, n = f"{base}-{n}", n + 1
    return slug


def create_category(*, user, **data) -> Category:
    category = Category.objects.create(slug=_unique_slug(data["name"]), **data)
    emit_activity(actor=user, verb="category.created", target=category)
    return category


def update_category(*, category: Category, user, **data) -> Category:
    if "name" in data and data["name"] != category.name:
        category.slug = _unique_slug(data["name"], exclude_pk=category.pk)
    for field, value in data.items():
        setattr(category, field, value)
    category.save()
    emit_activity(actor=user, verb="category.updated", target=category)
    return category


def create_supplier(*, user, **data) -> Supplier:
    supplier = Supplier.objects.create(**data)
    emit_activity(actor=user, verb="supplier.created", target=supplier)
    return supplier


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
def generate_sku(category: Category) -> str:
    prefix = re.sub(r"[^A-Z0-9]", "", category.name.upper())[:3] or "SKU"
    number = Product.objects.filter(sku__startswith=f"{prefix}-").count() + 1
    while Product.objects.filter(sku=f"{prefix}-{number:05d}").exists():
        number += 1
    return f"{prefix}-{number:05d}"


@transaction.atomic
def create_product(*, user, opening_stock: int = 0, **data) -> Product:
    from apps.inventory.services import stock_in  # local import avoids app-load cycles

    data.pop("remove_image", None)
    if not data.get("sku"):
        data["sku"] = generate_sku(data["category"])
    product = Product.objects.create(created_by=user, **data)
    if opening_stock:
        stock_in(
            product=product,
            quantity=opening_stock,
            user=user,
            unit_cost=product.cost_price,
            supplier=product.supplier,
            note="Opening stock",
        )
    emit_activity(actor=user, verb="product.created", target=product, metadata={"sku": product.sku})
    return product


@transaction.atomic
def update_product(*, product: Product, user, **data) -> Product:
    if data.pop("remove_image", False) and product.image:
        product.image.delete(save=False)
        product.image = None
    was_active = product.is_active
    for field, value in data.items():
        setattr(product, field, value)
    product.save()

    verb = "product.updated"
    if was_active and not product.is_active:
        verb = "product.archived"
    elif not was_active and product.is_active:
        verb = "product.restored"
    emit_activity(actor=user, verb=verb, target=product, metadata={"fields": sorted(data.keys())})
    return product
