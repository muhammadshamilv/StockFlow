from rest_framework import serializers

from .models import ActivityLog, Notification

VERB_LABELS = {
    "auth.registered": "created an account",
    "auth.login": "signed in",
    "auth.logout": "signed out",
    "auth.password_changed": "changed their password",
    "auth.password_reset_requested": "requested a password reset",
    "auth.password_reset": "reset their password",
    "profile.updated": "updated their profile",
    "user.created": "created user",
    "user.updated": "updated user",
    "category.created": "created category",
    "category.updated": "updated category",
    "category.deleted": "deleted category",
    "supplier.created": "added supplier",
    "supplier.updated": "updated supplier",
    "supplier.deleted": "deleted supplier",
    "product.created": "added product",
    "product.updated": "updated product",
    "product.archived": "archived product",
    "product.restored": "restored product",
    "product.deleted": "deleted product",
    "product.imported": "imported products from CSV",
    "stock.in": "received stock for",
    "stock.out": "removed stock from",
    "stock.adjusted": "adjusted stock of",
    "customer.created": "added customer",
    "customer.updated": "updated customer",
    "customer.deleted": "deleted customer",
    "sale.created": "recorded sale",
    "sale.cancelled": "cancelled sale",
}


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()
    action = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "actor",
            "actor_name",
            "actor_initials",
            "verb",
            "action",
            "description",
            "target_type",
            "target_id",
            "target_repr",
            "metadata",
            "created_at",
        ]

    def get_actor_name(self, obj) -> str:
        return obj.actor.full_name if obj.actor else "System"

    def get_actor_initials(self, obj) -> str:
        return (obj.actor.full_name[:2] if obj.actor else "SY").upper()

    def get_action(self, obj) -> str:
        return VERB_LABELS.get(obj.verb, obj.verb.replace(".", " ").replace("_", " "))

    def get_description(self, obj) -> str:
        parts = [self.get_actor_name(obj), self.get_action(obj)]
        if obj.target_repr and not obj.verb.startswith(("auth.", "profile.")):
            parts.append(obj.target_repr)
        return " ".join(parts)


class NotificationSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "kind",
            "kind_display",
            "level",
            "title",
            "message",
            "link",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields
