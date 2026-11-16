from decimal import Decimal

import pytest

from apps.inventory import services
from apps.inventory.models import StockMovement
from apps.inventory.signals import stock_status_changed

pytestmark = pytest.mark.django_db(transaction=True)

URL = "/api/v1/stock-movements/"


def test_stock_out_cannot_go_negative(client_for, staff_user, make_product):
    product = make_product(stock=3)
    response = client_for(staff_user).post(
        URL, {"product": product.pk, "movement_type": "OUT", "quantity": 5}
    )
    assert response.status_code == 400
    assert response.data["error"]["code"] == "insufficient_stock"
    product.refresh_from_db()
    assert product.quantity == 3


def test_stock_in_uses_weighted_average_cost(client_for, staff_user, make_product):
    product = make_product(stock=10, cost="100.00")
    response = client_for(staff_user).post(
        URL, {"product": product.pk, "movement_type": "IN", "quantity": 10, "unit_cost": "200.00"}
    )
    assert response.status_code == 201, response.data
    assert response.data["direction"] == "in" and response.data["signed_quantity"] == 10
    product.refresh_from_db()
    assert product.quantity == 20
    assert product.cost_price == Decimal("150.00")


def test_staff_cannot_adjust(client_for, staff_user, manager_user, make_product):
    product = make_product(stock=10)
    payload = {"product": product.pk, "movement_type": "ADJUSTMENT", "quantity": 4}
    assert client_for(staff_user).post(URL, payload).status_code == 400
    response = client_for(manager_user).post(URL, payload)
    assert response.status_code == 201
    assert response.data["signed_quantity"] == -6


def test_movements_are_immutable(make_product):
    make_product(stock=5)
    movement = StockMovement.objects.get()
    with pytest.raises(ValueError):
        movement.note = "edit"
        movement.save()
    with pytest.raises(ValueError):
        movement.delete()


def test_status_change_signal_fires_on_threshold(make_product, admin_user):
    product = make_product(stock=10, reorder=5)
    received = []

    def handler(sender, **kwargs):
        received.append((kwargs["previous_status"], kwargs["new_status"]))

    stock_status_changed.connect(handler)
    try:
        services.stock_out(product=product, quantity=6, user=admin_user)  # 10 -> 4 : low
        services.stock_out(product=product, quantity=1, user=admin_user)  # 4 -> 3 : still low
        services.stock_out(product=product, quantity=3, user=admin_user)  # 3 -> 0 : out
    finally:
        stock_status_changed.disconnect(handler)
    assert received == [("in_stock", "low_stock"), ("low_stock", "out_of_stock")]


def test_filters(client_for, staff_user, make_product, admin_user):
    product = make_product(stock=10)
    services.stock_out(product=product, quantity=2, user=admin_user)
    client = client_for(staff_user)
    assert client.get(URL, {"direction": "out"}).data["count"] == 1
    assert client.get(URL, {"movement_type": ["IN", "OUT"]}).data["count"] == 2
    assert client.get(URL, {"product": product.pk}).data["count"] == 2


def test_no_update_or_delete_routes(client_for, admin_user, make_product):
    make_product()
    movement = StockMovement.objects.get()
    client = client_for(admin_user)
    assert client.patch(f"{URL}{movement.pk}/", {"note": "x"}).status_code == 405
    assert client.delete(f"{URL}{movement.pk}/").status_code == 405
