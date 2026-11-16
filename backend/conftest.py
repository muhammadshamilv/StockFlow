"""Shared pytest fixtures for every app."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User

PASSWORD = "Str0ng!Passw0rd"


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


def _make_user(username: str, role: str, **extra) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@stockflow.test", password=PASSWORD, role=role, **extra
    )


@pytest.fixture
def admin_user(db) -> User:
    return _make_user("admin", User.Role.ADMIN, first_name="Ada", last_name="Admin")


@pytest.fixture
def manager_user(db) -> User:
    return _make_user("manager", User.Role.MANAGER)


@pytest.fixture
def staff_user(db) -> User:
    return _make_user("staff", User.Role.STAFF)


@pytest.fixture
def client_for():
    """client_for(user) -> APIClient authenticated without going through cookies."""

    def _factory(user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    return _factory


# --------------------------------------------------------------------------- #
# Catalog helpers
# --------------------------------------------------------------------------- #
@pytest.fixture
def category(db):
    from apps.catalog.models import Category

    return Category.objects.create(name="Electronics", slug="electronics")


@pytest.fixture
def make_product(db, category, admin_user):
    from decimal import Decimal

    from apps.catalog import services

    def _factory(name="Wireless Mouse", stock=20, cost="300.00", price="500.00", reorder=5, **extra):
        return services.create_product(
            user=admin_user,
            opening_stock=stock,
            name=name,
            category=extra.pop("category", category),
            cost_price=Decimal(cost),
            selling_price=Decimal(price),
            reorder_level=reorder,
            **extra,
        )

    return _factory
