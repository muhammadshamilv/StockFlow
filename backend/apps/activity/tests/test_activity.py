import pytest

from apps.activity.models import ActivityLog, Notification
from apps.inventory import services as inventory

pytestmark = pytest.mark.django_db(transaction=True)


def test_low_and_out_of_stock_notify_managers_only(make_product, admin_user, manager_user, staff_user):
    product = make_product(stock=10, reorder=5)
    inventory.stock_out(product=product, quantity=6, user=staff_user)
    assert Notification.objects.filter(kind="LOW_STOCK").count() == 2  # admin + manager
    assert not Notification.objects.filter(recipient=staff_user).exists()

    inventory.stock_out(product=product, quantity=4, user=staff_user)
    critical = Notification.objects.get(recipient=manager_user, kind="OUT_OF_STOCK")
    assert critical.level == "CRITICAL" and critical.link == f"/products/{product.pk}"

    inventory.stock_in(product=product, quantity=20, user=manager_user)
    assert Notification.objects.filter(recipient=manager_user, kind="RESTOCKED").exists()


def test_notification_endpoints(client_for, make_product, manager_user, staff_user):
    product = make_product(stock=6, reorder=5)
    inventory.stock_out(product=product, quantity=2, user=staff_user)
    inventory.stock_out(product=product, quantity=4, user=staff_user)
    client = client_for(manager_user)

    assert client.get("/api/v1/notifications/unread-count/").data == {"count": 2}
    first = client.get("/api/v1/notifications/").data["results"][0]
    assert client.post(f"/api/v1/notifications/{first['id']}/read/").data["is_read"] is True
    assert client.get("/api/v1/notifications/", {"is_read": "false"}).data["count"] == 1
    assert client.post("/api/v1/notifications/read-all/").data == {"count": 1}
    assert client.post("/api/v1/notifications/clear-read/").status_code == 204
    assert client.get("/api/v1/notifications/").data["count"] == 0

    # Users only see their own notifications
    assert client_for(staff_user).get("/api/v1/notifications/").data["count"] == 0


def test_activity_log_records_and_describes(client_for, make_product, admin_user, staff_user):
    make_product(name="Desk Lamp")
    log = ActivityLog.objects.filter(verb="product.created").get()
    assert log.actor == admin_user and log.target_type == "catalog.product"

    assert client_for(staff_user).get("/api/v1/activity/").status_code == 403
    rows = client_for(admin_user).get("/api/v1/activity/", {"verb_prefix": "product."}).data["results"]
    assert rows[0]["description"].startswith("Ada Admin added product Desk Lamp")


def test_new_registration_notifies_admins(api_client, admin_user):
    api_client.post(
        "/api/v1/auth/register/",
        {
            "username": "newbie",
            "email": "n@x.com",
            "password": "G00d!Passw0rd",
            "password_confirm": "G00d!Passw0rd",
            "accept_terms": True,
        },
    )
    assert Notification.objects.filter(recipient=admin_user, kind="NEW_USER").exists()
