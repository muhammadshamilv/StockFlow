"""Test settings – fast hashing, in-memory email, no throttling."""

from .base import *  # noqa: F403
from .base import REST_FRAMEWORK

DEBUG = False

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ()

MEDIA_ROOT = BASE_DIR / ".test-media"  # noqa: F405
