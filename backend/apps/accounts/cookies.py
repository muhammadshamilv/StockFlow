"""Helpers that write / clear the httpOnly JWT cookies."""

from datetime import timedelta

from django.conf import settings
from rest_framework.response import Response


def _cfg() -> dict:
    return settings.AUTH_COOKIE


def set_auth_cookies(
    response: Response, *, access: str, refresh: str, refresh_lifetime: timedelta, remember: bool
) -> None:
    cfg = _cfg()
    access_lifetime: timedelta = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]

    response.set_cookie(
        cfg["ACCESS_NAME"],
        access,
        max_age=int(access_lifetime.total_seconds()),
        httponly=True,
        secure=cfg["SECURE"],
        samesite=cfg["SAMESITE"],
        domain=cfg["DOMAIN"],
        path="/",
    )
    response.set_cookie(
        cfg["REFRESH_NAME"],
        refresh,
        # Without "remember me" the refresh cookie dies when the browser closes
        max_age=int(refresh_lifetime.total_seconds()) if remember else None,
        httponly=True,
        secure=cfg["SECURE"],
        samesite=cfg["SAMESITE"],
        domain=cfg["DOMAIN"],
        path=cfg["REFRESH_PATH"],
    )


def clear_auth_cookies(response: Response) -> None:
    cfg = _cfg()
    response.delete_cookie(cfg["ACCESS_NAME"], path="/", domain=cfg["DOMAIN"], samesite=cfg["SAMESITE"])
    response.delete_cookie(
        cfg["REFRESH_NAME"], path=cfg["REFRESH_PATH"], domain=cfg["DOMAIN"], samesite=cfg["SAMESITE"]
    )


def get_refresh_cookie(request) -> str | None:
    return request.COOKIES.get(_cfg()["REFRESH_NAME"])
