from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "INFO", "Info"
        SUCCESS = "SUCCESS", "Success"
        WARNING = "WARNING", "Warning"
        CRITICAL = "CRITICAL", "Critical"

    class Kind(models.TextChoices):
        LOW_STOCK = "LOW_STOCK", "Low stock"
        OUT_OF_STOCK = "OUT_OF_STOCK", "Out of stock"
        RESTOCKED = "RESTOCKED", "Restocked"
        NEW_USER = "NEW_USER", "New user"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    title = models.CharField(max_length=140)
    message = models.CharField(max_length=500, blank=True)
    link = models.CharField(max_length=200, blank=True, help_text="Frontend route, e.g. /products/12")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["recipient", "is_read", "-created_at"])]

    def __str__(self) -> str:
        return self.title
