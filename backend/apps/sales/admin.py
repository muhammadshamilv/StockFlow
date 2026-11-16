from django.contrib import admin

from .models import Customer, DocumentSequence, Sale, SaleItem


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "phone", "email", "tax_id")


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "sku", "quantity", "unit_price", "unit_cost", "line_total")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    """Read-only in admin: sales change only through the API services."""

    list_display = (
        "invoice_number",
        "customer",
        "status",
        "payment_method",
        "total",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("invoice_number", "customer__name")
    list_select_related = ("customer", "created_by")
    inlines = [SaleItemInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DocumentSequence)
class DocumentSequenceAdmin(admin.ModelAdmin):
    list_display = ("key", "year", "last_value")
