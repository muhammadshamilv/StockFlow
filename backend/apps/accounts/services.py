"""
Account business logic. Views stay thin and call these functions.
"""

import logging
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, user_logged_in, user_logged_out
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import exceptions
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.signals import emit_activity

from .models import User

logger = logging.getLogger("apps.accounts")

REMEMBER_CLAIM = "remember"


class InvalidCredentials(exceptions.APIException):
    """401 for bad login attempts (DRF would coerce AuthenticationFailed to 403 on public views)."""

    status_code = 401
    default_code = "invalid_credentials"
    default_detail = "Invalid username/email or password."


@dataclass(frozen=True)
class TokenPair:
    access: str
    refresh: str
    refresh_lifetime: timedelta
    remember: bool


# --------------------------------------------------------------------------- #
# Registration & login
# --------------------------------------------------------------------------- #
@transaction.atomic
def register_user(
    *, username: str, email: str, password: str, first_name: str = "", last_name: str = ""
) -> User:
    """
    Create a user. The very first account becomes ADMIN so a fresh install
    can be bootstrapped from the UI; everyone after that starts as STAFF.
    """
    is_first_user = not User.objects.exists()
    user = User.objects.create_user(
        username=username.strip(),
        email=email,
        password=password,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        role=User.Role.ADMIN if is_first_user else User.Role.STAFF,
    )
    emit_activity(actor=user, verb="auth.registered", target=user, metadata={"role": user.role})
    return user


def authenticate_user(*, request, identifier: str, password: str) -> User:
    """Authenticate with username OR email. Error message never reveals which part was wrong."""
    identifier = identifier.strip()
    lookup = {"email__iexact": identifier} if "@" in identifier else {"username__iexact": identifier}
    candidate = User.objects.filter(**lookup).first()
    username = candidate.username if candidate else identifier

    # Django's ModelBackend still runs the hasher for unknown users (timing-safe)
    user = authenticate(request, username=username, password=password)
    if user is None:
        # Only reveal "deactivated" to someone who knows the correct password
        if candidate and not candidate.is_active and candidate.check_password(password):
            raise InvalidCredentials(
                "This account has been deactivated. Contact your administrator.",
                code="account_disabled",
            )
        raise InvalidCredentials()
    return user


def login(*, request, user: User, remember: bool) -> TokenPair:
    pair = issue_tokens(user, remember=remember)
    user_logged_in.send(sender=user.__class__, request=request, user=user)  # updates last_login
    emit_activity(actor=user, verb="auth.login", target=user, metadata={"remember": remember})
    return pair


def logout(*, request, raw_refresh: str | None) -> None:
    if raw_refresh:
        try:
            token = RefreshToken(raw_refresh)
            user = User.objects.filter(pk=token.get("user_id")).first()
            token.blacklist()
            if user:
                user_logged_out.send(sender=User, request=request, user=user)
                emit_activity(actor=user, verb="auth.logout", target=user)
        except TokenError:
            pass  # already invalid – nothing to revoke


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #
def _refresh_lifetime(remember: bool) -> timedelta:
    if remember:
        return timedelta(days=settings.AUTH_COOKIE["REMEMBER_ME_DAYS"])
    return settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]


def issue_tokens(user: User, *, remember: bool) -> TokenPair:
    lifetime = _refresh_lifetime(remember)
    refresh = RefreshToken.for_user(user)
    refresh[REMEMBER_CLAIM] = remember
    refresh["role"] = user.role
    refresh.set_exp(lifetime=lifetime)
    # OutstandingToken stored by for_user() has the default expiry – keep it in sync
    OutstandingToken.objects.filter(jti=refresh["jti"]).update(expires_at=refresh.current_time + lifetime)

    access = refresh.access_token
    access["role"] = user.role
    return TokenPair(access=str(access), refresh=str(refresh), refresh_lifetime=lifetime, remember=remember)


@transaction.atomic
def rotate_refresh_token(raw_refresh: str | None) -> tuple[User, TokenPair]:
    """Validate the refresh cookie, blacklist it and hand out a fresh pair."""
    if not raw_refresh:
        raise exceptions.NotAuthenticated("Session expired. Please log in again.", code="no_refresh")
    try:
        token = RefreshToken(raw_refresh)  # verifies signature, expiry and blacklist
    except TokenError as exc:
        raise exceptions.NotAuthenticated(
            "Session expired. Please log in again.", code="token_invalid"
        ) from exc

    user = User.objects.filter(pk=token.get("user_id"), is_active=True).first()
    if user is None:
        raise exceptions.NotAuthenticated("Account unavailable.", code="user_inactive")

    remember = bool(token.get(REMEMBER_CLAIM, False))
    token.blacklist()
    return user, issue_tokens(user, remember=remember)


def revoke_all_tokens(user: User) -> int:
    """Blacklist every outstanding refresh token of a user (log out everywhere)."""
    outstanding = OutstandingToken.objects.filter(user=user).exclude(blacklistedtoken__isnull=False)
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=t) for t in outstanding], ignore_conflicts=True
    )
    return len(outstanding)


# --------------------------------------------------------------------------- #
# Passwords
# --------------------------------------------------------------------------- #
@transaction.atomic
def change_password(*, user: User, new_password: str) -> None:
    user.set_password(new_password)
    user.save(update_fields=["password"])
    revoke_all_tokens(user)
    emit_activity(actor=user, verb="auth.password_changed", target=user)


def send_password_reset_email(*, email: str) -> None:
    """Always succeeds silently so attackers cannot discover registered emails."""
    user = User.objects.filter(email__iexact=email.strip(), is_active=True).first()
    if user is None:
        logger.info("Password reset requested for unknown email")
        return

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60

    send_mail(
        subject="Reset your StockFlow password",
        message=(
            f"Hi {user.first_name or user.username},\n\n"
            f"We received a request to reset your StockFlow password.\n"
            f"Open this link within {minutes} minutes to choose a new one:\n\n{link}\n\n"
            "If you didn't request this, you can safely ignore this email.\n\n— StockFlow"
        ),
        from_email=None,
        recipient_list=[user.email],
    )
    emit_activity(actor=user, verb="auth.password_reset_requested", target=user)


def resolve_reset_user(*, uid: str, token: str) -> User:
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=pk, is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError) as exc:
        raise exceptions.ValidationError({"token": ["This reset link is invalid."]}) from exc
    if not default_token_generator.check_token(user, token):
        raise exceptions.ValidationError({"token": ["This reset link is invalid or has expired."]})
    return user


@transaction.atomic
def reset_password(*, user: User, new_password: str) -> None:
    user.set_password(new_password)
    user.save(update_fields=["password"])
    revoke_all_tokens(user)
    emit_activity(actor=user, verb="auth.password_reset", target=user)
