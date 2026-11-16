from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "selling_price", "quantity", "reorder_level", "is_active")
    list_filter = ("is_active", "category", "unit")
    search_fields = ("sku", "name", "barcode")
    list_select_related = ("category",)
    readonly_fields = ("quantity", "created_by", "created_at", "updated_at")
    autocomplete_fields = ("category",)
