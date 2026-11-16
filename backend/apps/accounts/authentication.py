"""
Cookie-based JWT authentication with CSRF protection.

* Browser (SPA): access token arrives in the httpOnly `sf_access` cookie.
  Because cookies are sent automatically, unsafe requests MUST carry a valid
  `X-CSRFToken` header – exactly like Django session auth.
* API clients / scripts: may still send `Authorization: Bearer <token>`;
  header auth is not CSRF-checked (no ambient credentials involved).
"""

from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


def enforce_csrf(request) -> None:
    def _noop(_request):  # pragma: no cover - never called
        return None

    check = CSRFCheck(_noop)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f"CSRF failed: {reason}")


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get(settings.AUTH_COOKIE["ACCESS_NAME"])
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        enforce_csrf(request)
        return user, validated_token

    def authenticate_header(self, request):
        # Makes DRF answer 401 (not 403) for unauthenticated requests,
        # which is what the SPA's refresh interceptor listens for.
        return 'Bearer realm="api"'
