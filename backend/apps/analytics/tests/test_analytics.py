import pytest

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def sold(client_for, staff_user, make_product):
    mouse = make_product(name="Mouse", stock=10, cost="300", price="500", reorder=8)
    client_for(staff_user).post(
        "/api/v1/sales/", {"items": [{"product": mouse.pk, "quantity": 3}], "tax_rate": "0"}, format="json"
    )
    return mouse


@pytest.mark.parametrize("range_key", ["7d", "30d", "90d", "12m", "bogus"])
def test_dashboard_shape(client_for, manager_user, sold, range_key):
    data = client_for(manager_user).get("/api/v1/analytics/dashboard/", {"range": range_key}).data
    assert data["range"] == (range_key if range_key != "bogus" else "30d")
    assert data["kpis"]["revenue"]["value"] == "1500.00"
    assert data["kpis"]["profit"]["value"] == "600.00"
    assert data["kpis"]["orders"]["value"] == "1.00"
    assert data["inventory"]["low_stock"] == 1
    assert data["top_products"][0]["units"] == 3
    assert data["category_breakdown"][0]["share"] == 100.0
    assert data["stock_alerts"][0]["quantity"] == 7
    assert sum(float(p["revenue"]) for p in data["revenue_trend"]) == 1500.0


def test_staff_cannot_see_profit(client_for, staff_user, sold):
    data = client_for(staff_user).get("/api/v1/analytics/dashboard/").data
    assert data["kpis"]["profit"]["value"] == "0.00"
    assert data["inventory"]["stock_value"] == "0.00"


def test_sales_report_csv(client_for, manager_user, staff_user, sold):
    assert client_for(staff_user).get("/api/v1/analytics/reports/sales/").status_code == 403
    response = client_for(manager_user).get("/api/v1/analytics/reports/sales/")
    body = b"".join(response.streaming_content).decode()
    assert body.splitlines()[0].startswith("invoice,date,status")
    assert "Mouse" in body
