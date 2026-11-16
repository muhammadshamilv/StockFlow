from django.contrib import admin

from .models import ActivityLog, Notification


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "verb", "target_repr")
    list_filter = ("verb", "created_at")
    search_fields = ("target_repr", "verb", "actor__username")
    list_select_related = ("actor",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "recipient", "kind", "level", "title", "is_read")
    list_filter = ("kind", "level", "is_read")
    search_fields = ("title", "recipient__username")
