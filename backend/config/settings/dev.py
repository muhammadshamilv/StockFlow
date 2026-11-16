"""Local development settings."""

from .base import *  # noqa: F403
from .base import REST_FRAMEWORK

DEBUG = True

# Browsable API is handy while developing
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)
