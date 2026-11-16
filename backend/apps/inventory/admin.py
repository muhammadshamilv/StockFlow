from django.contrib import admin

from .models import StockMovement


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Read-only: the ledger is immutable."""

    list_display = (
        "created_at",
        "product",
        "movement_type",
        "quantity",
        "quantity_before",
        "quantity_after",
        "reference",
        "created_by",
    )
    list_filter = ("movement_type", "created_at")
    search_fields = ("product__name", "product__sku", "reference")
    list_select_related = ("product", "created_by")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
