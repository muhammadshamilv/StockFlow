from django.contrib.auth import get_user_model
from django.db.models import Model

from .models import ActivityLog, Notification


def record_activity(
    *, actor, verb: str, target: Model | None = None, metadata: dict | None = None
) -> ActivityLog:
    target_type = target_id = target_repr = ""
    if target is not None:
        target_type = target._meta.label_lower
        target_id = str(target.pk)
        target_repr = str(target)[:200]
    return ActivityLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        verb=verb,
        target_type=target_type,
        target_id=target_id,
        target_repr=target_repr,
        metadata=_json_safe(metadata or {}),
    )


def notify_roles(*, roles: tuple[str, ...], exclude_user=None, **fields) -> int:
    User = get_user_model()
    recipients = User.objects.filter(role__in=roles, is_active=True)
    if exclude_user is not None:
        recipients = recipients.exclude(pk=exclude_user.pk)
    Notification.objects.bulk_create([Notification(recipient=user, **fields) for user in recipients])
    return recipients.count()


def _json_safe(value):
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Model):
        return str(value)
    return str(value)
