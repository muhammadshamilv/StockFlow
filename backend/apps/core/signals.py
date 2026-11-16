"""
Project-wide domain signals.

Services emit `activity` whenever something worth auditing happens.
The `activity` app listens and persists it – no app imports another app's
audit code, so modules stay decoupled.
"""

from django.dispatch import Signal

# kwargs: actor, verb, target (model instance | None), metadata (dict | None)
activity = Signal()


def emit_activity(*, actor, verb: str, target=None, metadata: dict | None = None) -> None:
    activity.send(sender=None, actor=actor, verb=verb, target=target, metadata=metadata or {})
