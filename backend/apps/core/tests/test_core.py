import pytest

pytestmark = pytest.mark.django_db


def test_health_check_is_public(api_client):
    response = api_client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.data == {"status": "ok", "database": "ok"}


def test_pagination_envelope(client_for, admin_user, category):
    data = client_for(admin_user).get("/api/v1/categories/", {"page_size": 1}).data
    assert set(data) == {"count", "page", "page_size", "total_pages", "next", "previous", "results"}
    assert data["page"] == 1 and data["total_pages"] == 1


def test_unified_404(client_for, admin_user):
    response = client_for(admin_user).get("/api/v1/products/999999/")
    assert response.status_code == 404
    assert response.data["error"]["code"] == "not_found"
