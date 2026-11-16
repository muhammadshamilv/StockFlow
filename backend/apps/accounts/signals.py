"""Account domain signals."""

from django.dispatch import Signal

# kwargs: user
user_registered = Signal()
