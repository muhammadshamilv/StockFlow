"""
Unified API error format.

Every error response looks like:

    {
      "error": {
        "code": "validation_error",
        "message": "Human readable summary",
        "details": { "field": ["message", ...] }   # optional
      }
    }
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError, RestrictedError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("apps.core")


class BusinessRuleViolation(exceptions.APIException):
    """A request that is well-formed but breaks a business rule (e.g. not enough stock)."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "business_rule_violation"
    default_detail = "This action is not allowed."


class ConflictError(exceptions.APIException):
    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"
    default_detail = "The resource is in a conflicting state."


def _first_message(detail) -> str:
    """Pull the first readable message out of a nested DRF error structure."""
    if isinstance(detail, list) and detail:
        return _first_message(detail[0])
    if isinstance(detail, dict) and detail:
        return _first_message(next(iter(detail.values())))
    return str(detail)


def api_exception_handler(exc, context):
    # Translate Django-level exceptions into DRF ones first
    if isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
    elif isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()
    elif isinstance(exc, (ProtectedError, RestrictedError)):
        exc = ConflictError(
            "This record is in use by other records and cannot be deleted. Archive it instead."
        )

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            {
                "error": {
                    "code": "server_error",
                    "message": "Something went wrong on our side. Please try again.",
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, exceptions.ValidationError):
        code = "validation_error"
        details = exc.detail if isinstance(exc.detail, dict) else {"non_field_errors": exc.detail}
        message = _first_message(exc.detail)
    else:
        codes = exc.get_codes() if isinstance(exc, exceptions.APIException) else "error"
        code = codes if isinstance(codes, str) else "error"
        details = None
        message = _first_message(getattr(exc, "detail", str(exc)))

    payload = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    response.data = payload
    return response
