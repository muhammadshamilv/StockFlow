"""Teach drf-spectacular how our cookie authentication works (for Swagger UI)."""

from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieJWTScheme(OpenApiAuthenticationExtension):
    target_class = "apps.accounts.authentication.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.AUTH_COOKIE["ACCESS_NAME"],
            "description": "Log in via POST /api/v1/auth/login/ – the httpOnly cookie is set automatically.",
        }
