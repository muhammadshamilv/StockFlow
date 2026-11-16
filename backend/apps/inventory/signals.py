"""Inventory domain signals (sent after the DB transaction commits)."""

from django.dispatch import Signal

# kwargs: product, movement, previous_status, new_status
stock_status_changed = Signal()
