from django.contrib.auth import get_user_model

from .models import Notification


def notify_roles(*, roles: tuple[str, ...], **fields) -> int:
    """Create the same notification for every active user with one of `roles`."""
    recipients = list(get_user_model().objects.filter(role__in=roles, is_active=True))
    Notification.objects.bulk_create([Notification(recipient=user, **fields) for user in recipients])
    return len(recipients)
