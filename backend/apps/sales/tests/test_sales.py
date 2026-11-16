from decimal import Decimal

import pytest

from apps.catalog.models import Product
from apps.inventory.models import StockMovement
from apps.sales.models import Customer, Sale

pytestmark = pytest.mark.django_db(transaction=True)

URL = "/api/v1/sales/"


@pytest.fixture
def two_products(make_product):
    return make_product(name="Mouse", stock=10, cost="300", price="500"), make_product(
        name="Cable", stock=5, cost="50", price="200"
    )


def test_multi_item_sale_totals_stock_and_ledger(client_for, staff_user, two_products):
    mouse, cable = two_products
    customer = Customer.objects.create(name="Aisha")
    response = client_for(staff_user).post(
        URL,
        {
            "customer": customer.pk,
            "items": [
                {"product": mouse.pk, "quantity": 2},
                {"product": cable.pk, "quantity": 1},
                {"product": mouse.pk, "quantity": 1},  # duplicate line is merged
            ],
            "discount_amount": "100.00",
            "tax_rate": "18",
            "payment_method": "UPI",
            "amount_paid": "2000",
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    data = response.data
    assert data["invoice_number"].endswith("-00001")
    assert data["subtotal"] == "1700.00"  # 3*500 + 200
    assert data["tax_amount"] == "288.00"  # 18% of 1600
    assert data["total"] == "1888.00"
    assert data["change_due"] == "112.00"
    assert len(data["items"]) == 2
    assert data["gross_profit"] is None  # hidden from staff
    mouse.refresh_from_db()
    cable.refresh_from_db()
    assert (mouse.quantity, cable.quantity) == (7, 4)
    assert StockMovement.objects.filter(movement_type="SALE", reference=data["invoice_number"]).count() == 2


def test_insufficient_stock_rolls_back_everything(client_for, staff_user, two_products):
    mouse, cable = two_products
    response = client_for(staff_user).post(
        URL,
        {"items": [{"product": mouse.pk, "quantity": 1}, {"product": cable.pk, "quantity": 99}]},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["error"]["code"] == "insufficient_stock"
    mouse.refresh_from_db()
    assert mouse.quantity == 10
    assert Sale.objects.count() == 0


def test_invoice_numbers_are_sequential(client_for, staff_user, two_products):
    mouse, _ = two_products
    client = client_for(staff_user)
    numbers = [
        client.post(URL, {"items": [{"product": mouse.pk, "quantity": 1}]}, format="json").data[
            "invoice_number"
        ]
        for _ in range(3)
    ]
    assert [n[-5:] for n in numbers] == ["00001", "00002", "00003"]


def test_price_override_requires_manager(client_for, staff_user, manager_user, two_products):
    mouse, _ = two_products
    payload = {"items": [{"product": mouse.pk, "quantity": 1, "unit_price": "1.00"}], "tax_rate": "0"}
    assert client_for(staff_user).post(URL, payload, format="json").status_code == 400
    response = client_for(manager_user).post(URL, payload, format="json")
    assert response.status_code == 201
    assert response.data["total"] == "1.00"
    assert Decimal(response.data["gross_profit"]) == Decimal("-299.00")


def test_discount_cannot_exceed_subtotal(client_for, staff_user, two_products):
    mouse, _ = two_products
    response = client_for(staff_user).post(
        URL, {"items": [{"product": mouse.pk, "quantity": 1}], "discount_amount": "9999"}, format="json"
    )
    assert response.status_code == 400
    assert response.data["error"]["code"] == "discount_too_high"


def test_archived_product_cannot_be_sold(client_for, staff_user, two_products):
    mouse, _ = two_products
    Product.objects.filter(pk=mouse.pk).update(is_active=False)
    response = client_for(staff_user).post(
        URL, {"items": [{"product": mouse.pk, "quantity": 1}]}, format="json"
    )
    assert response.status_code == 400


def test_cancel_restores_stock_manager_only(client_for, staff_user, manager_user, two_products):
    mouse, _ = two_products
    sale = (
        client_for(staff_user)
        .post(URL, {"items": [{"product": mouse.pk, "quantity": 4}]}, format="json")
        .data
    )
    cancel_url = f"{URL}{sale['id']}/cancel/"
    assert client_for(staff_user).post(cancel_url, {"reason": "Wrong item"}).status_code == 403

    response = client_for(manager_user).post(cancel_url, {"reason": "Wrong item"})
    assert response.status_code == 200
    assert response.data["status"] == "CANCELLED"
    mouse.refresh_from_db()
    assert mouse.quantity == 10
    assert client_for(manager_user).post(cancel_url, {"reason": "again"}).status_code == 409


def test_invoice_pdf_and_list_filters(client_for, staff_user, two_products):
    mouse, _ = two_products
    client = client_for(staff_user)
    sale = client.post(URL, {"items": [{"product": mouse.pk, "quantity": 1}]}, format="json").data
    pdf = client.get(f"{URL}{sale['id']}/invoice/")
    assert pdf["Content-Type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF")

    listing = client.get(URL, {"search": "Mouse", "walk_in": "true"}).data
    assert listing["count"] == 1
    assert listing["results"][0]["customer_name"] == "Walk-in customer"
    assert listing["results"][0]["items_count"] == 1

    summary = client.get(f"{URL}summary/").data
    assert summary["orders"] == 1


def test_customer_annotations_and_history(client_for, staff_user, manager_user, two_products):
    mouse, _ = two_products
    client = client_for(staff_user)
    customer = client.post("/api/v1/customers/", {"name": "Rohan", "phone": "999"}).data
    client.post(
        URL,
        {"customer": customer["id"], "items": [{"product": mouse.pk, "quantity": 1}], "tax_rate": "0"},
        format="json",
    )
    row = client.get(f"/api/v1/customers/{customer['id']}/").data
    assert row["orders_count"] == 1 and row["total_spent"] == "500.00"
    assert client.get(f"/api/v1/customers/{customer['id']}/sales/").data["count"] == 1
    assert client.delete(f"/api/v1/customers/{customer['id']}/").status_code == 403
