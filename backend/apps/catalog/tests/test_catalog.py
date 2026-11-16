import pytest

from apps.inventory.models import StockMovement

pytestmark = pytest.mark.django_db


class TestCategories:
    def test_staff_can_read_but_not_write(self, client_for, staff_user, category):
        client = client_for(staff_user)
        assert client.get("/api/v1/categories/").status_code == 200
        assert client.post("/api/v1/categories/", {"name": "Toys"}).status_code == 403

    def test_manager_creates_with_slug_and_ci_unique(self, client_for, manager_user, category):
        client = client_for(manager_user)
        response = client.post("/api/v1/categories/", {"name": "Home & Kitchen", "color": "#10B981"})
        assert response.status_code == 201
        assert response.data["slug"] == "home-kitchen"
        dup = client.post("/api/v1/categories/", {"name": "ELECTRONICS"})
        assert dup.status_code == 400

    def test_annotations(self, client_for, admin_user, make_product):
        make_product(stock=10, cost="100.00")
        row = client_for(admin_user).get("/api/v1/categories/").data["results"][0]
        assert row["product_count"] == 1
        assert row["stock_units"] == 10
        assert row["stock_value"] == "1000.00"

    def test_delete_with_products_returns_409(self, client_for, admin_user, category, make_product):
        make_product()
        response = client_for(admin_user).delete(f"/api/v1/categories/{category.pk}/")
        assert response.status_code == 409
        assert response.data["error"]["code"] == "conflict"

    def test_options_endpoint_unpaginated(self, client_for, staff_user, category):
        data = client_for(staff_user).get("/api/v1/categories/options/").data
        assert data == [{"id": category.pk, "name": "Electronics", "color": "#3B82F6"}]


class TestProducts:
    def test_create_with_opening_stock_writes_ledger(self, client_for, manager_user, category):
        response = client_for(manager_user).post(
            "/api/v1/products/",
            {
                "name": "USB-C Cable",
                "category": category.pk,
                "cost_price": "80",
                "selling_price": "199",
                "opening_stock": 25,
            },
        )
        assert response.status_code == 201, response.data
        assert response.data["sku"] == "ELE-00001"
        assert response.data["quantity"] == 25
        assert response.data["stock_status"] == "in_stock"
        assert response.data["margin_percent"] == "59.8"
        movement = StockMovement.objects.get()
        assert movement.movement_type == "IN" and movement.quantity_after == 25

    def test_quantity_is_read_only_on_update(self, client_for, manager_user, make_product):
        product = make_product(stock=5)
        response = client_for(manager_user).patch(f"/api/v1/products/{product.pk}/", {"quantity": 999})
        assert response.status_code == 200
        assert response.data["quantity"] == 5

    def test_filters_and_summary(self, client_for, staff_user, make_product):
        make_product(name="A", stock=0)
        make_product(name="B", stock=3, reorder=5)
        make_product(name="C", stock=50)
        client = client_for(staff_user)
        assert client.get("/api/v1/products/", {"stock_status": "out_of_stock"}).data["count"] == 1
        assert client.get("/api/v1/products/", {"stock_status": "low_stock"}).data["count"] == 1
        assert client.get("/api/v1/products/", {"search": "c"}).data["count"] >= 1
        summary = client.get("/api/v1/products/summary/").data
        assert summary == {"total": 3, "in_stock": 1, "low_stock": 1, "out_of_stock": 1, "archived": 0}

    def test_delete_product_with_history_is_409(self, client_for, admin_user, make_product):
        product = make_product(stock=1)
        assert client_for(admin_user).delete(f"/api/v1/products/{product.pk}/").status_code == 409

    def test_adjust_stock(self, client_for, manager_user, staff_user, make_product):
        product = make_product(stock=10)
        url = f"/api/v1/products/{product.pk}/adjust-stock/"
        assert client_for(staff_user).post(url, {"counted_quantity": 7}).status_code == 403
        response = client_for(manager_user).post(url, {"counted_quantity": 7, "note": "Damaged"})
        assert response.status_code == 200 and response.data["quantity"] == 7

    def test_export_csv(self, client_for, staff_user, make_product):
        make_product()
        response = client_for(staff_user).get("/api/v1/products/export/")
        body = b"".join(response.streaming_content).decode()
        assert body.splitlines()[0].startswith("sku,barcode,name")
        assert "Wireless Mouse" in body
