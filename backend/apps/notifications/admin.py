from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "recipient", "kind", "level", "title", "is_read")
    list_filter = ("kind", "level", "is_read")
    search_fields = ("title", "recipient__username")
