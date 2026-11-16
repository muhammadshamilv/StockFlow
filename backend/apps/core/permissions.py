"""
Role-based permissions.

Roles (see accounts.User.Role):
    ADMIN   – everything, incl. user management
    MANAGER – full inventory/sales/reporting, no user management
    STAFF   – read catalog, record sales & stock movements
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


def _role(user) -> str | None:
    return getattr(user, "role", None) if user and user.is_authenticated else None


class IsAdmin(BasePermission):
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return _role(request.user) == "ADMIN"


class IsManagerOrAdmin(BasePermission):
    message = "Only managers or administrators can perform this action."

    def has_permission(self, request, view):
        return _role(request.user) in ("ADMIN", "MANAGER")


class IsManagerOrReadOnly(BasePermission):
    """Any authenticated user can read; only managers/admins can write."""

    message = "Only managers or administrators can modify this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _role(request.user) in ("ADMIN", "MANAGER")
