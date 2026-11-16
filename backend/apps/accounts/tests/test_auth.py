import re

import pytest
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from conftest import PASSWORD

pytestmark = pytest.mark.django_db

REGISTER = reverse("auth-register")
LOGIN = reverse("auth-login")
ME = reverse("auth-me")
REFRESH = reverse("auth-refresh")
LOGOUT = reverse("auth-logout")


def register_payload(**overrides):
    data = {
        "first_name": "Shamil",
        "last_name": "M",
        "username": "shamil",
        "email": "Shamil@Example.com",
        "password": "Sup3r$ecret!",
        "password_confirm": "Sup3r$ecret!",
        "accept_terms": True,
    }
    data.update(overrides)
    return data


class TestRegister:
    def test_first_user_becomes_admin_then_staff(self, api_client):
        r1 = api_client.post(REGISTER, register_payload())
        assert r1.status_code == 201, r1.data
        assert r1.data["user"]["role"] == "ADMIN"
        assert r1.data["user"]["email"] == "shamil@example.com"

        r2 = api_client.post(REGISTER, register_payload(username="second", email="second@example.com"))
        assert r2.data["user"]["role"] == "STAFF"

    def test_password_is_hashed(self, api_client):
        api_client.post(REGISTER, register_payload())
        user = User.objects.get(username="shamil")
        assert user.password != "Sup3r$ecret!"
        assert user.check_password("Sup3r$ecret!")

    def test_register_does_not_log_in(self, api_client):
        response = api_client.post(REGISTER, register_payload())
        assert "sf_access" not in response.cookies

    @pytest.mark.parametrize(
        ("overrides", "field"),
        [
            ({"password_confirm": "nope"}, "password_confirm"),
            ({"password": "12345678", "password_confirm": "12345678"}, "password"),
            ({"accept_terms": False}, "accept_terms"),
            ({"username": "a"}, "username"),
            ({"email": "not-an-email"}, "email"),
        ],
    )
    def test_validation_errors_use_unified_format(self, api_client, overrides, field):
        response = api_client.post(REGISTER, register_payload(**overrides))
        assert response.status_code == 400
        assert response.data["error"]["code"] == "validation_error"
        assert field in response.data["error"]["details"]

    def test_duplicate_username_and_email_case_insensitive(self, api_client):
        api_client.post(REGISTER, register_payload())
        response = api_client.post(REGISTER, register_payload(username="SHAMIL", email="SHAMIL@example.com"))
        assert response.status_code == 400
        details = response.data["error"]["details"]
        assert "username" in details and "email" in details


class TestLoginCookies:
    def test_login_with_username_sets_httponly_cookies(self, api_client, staff_user):
        response = api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        assert response.status_code == 200
        access = response.cookies["sf_access"]
        refresh = response.cookies["sf_refresh"]
        assert access["httponly"] and refresh["httponly"]
        assert refresh["path"] == "/api/v1/auth/"
        assert refresh["max-age"] == ""  # session cookie without remember-me
        assert "access" not in response.data  # tokens never in JSON body
        assert response.data["user"]["username"] == "staff"

    def test_login_with_email_and_remember_me(self, api_client, staff_user):
        response = api_client.post(
            LOGIN, {"identifier": "STAFF@stockflow.test", "password": PASSWORD, "remember_me": True}
        )
        assert response.status_code == 200
        assert int(response.cookies["sf_refresh"]["max-age"]) == 30 * 24 * 3600

    def test_wrong_password_generic_message(self, api_client, staff_user):
        response = api_client.post(LOGIN, {"identifier": "staff", "password": "wrong"})
        assert response.status_code == 401
        assert response.data["error"]["message"] == "Invalid username/email or password."

    def test_inactive_user_message(self, api_client, staff_user):
        staff_user.is_active = False
        staff_user.save()
        response = api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        assert response.status_code == 401
        assert response.data["error"]["code"] == "account_disabled"

    def test_cookie_authenticates_me_and_updates_last_login(self, api_client, staff_user):
        api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        response = api_client.get(ME)
        assert response.status_code == 200
        assert response.data["username"] == "staff"
        staff_user.refresh_from_db()
        assert staff_user.last_login is not None

    def test_me_requires_auth(self, api_client):
        response = api_client.get(ME)
        assert response.status_code == 401

    def test_stale_access_cookie_does_not_block_login(self, api_client, staff_user):
        api_client.cookies["sf_access"] = "garbage"
        response = api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        assert response.status_code == 200


class TestRefreshAndLogout:
    def test_refresh_rotates_and_blacklists_old_token(self, api_client, staff_user):
        api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD, "remember_me": True})
        old_refresh = api_client.cookies["sf_refresh"].value

        response = api_client.post(REFRESH)
        assert response.status_code == 200
        new_refresh = response.cookies["sf_refresh"].value
        assert new_refresh != old_refresh
        # remember-me survives rotation
        assert int(response.cookies["sf_refresh"]["max-age"]) == 30 * 24 * 3600

        reuse = APIClient()
        reuse.cookies["sf_refresh"] = old_refresh
        assert reuse.post(REFRESH).status_code == 401

    def test_refresh_without_cookie(self, api_client):
        response = api_client.post(REFRESH)
        assert response.status_code == 401
        assert response.data["error"]["code"] == "session_expired"

    def test_logout_clears_cookies_and_revokes(self, api_client, staff_user):
        api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        refresh = api_client.cookies["sf_refresh"].value
        response = api_client.post(LOGOUT)
        assert response.status_code == 204
        assert response.cookies["sf_access"].value == ""
        reuse = APIClient()
        reuse.cookies["sf_refresh"] = refresh
        assert reuse.post(REFRESH).status_code == 401


class TestCsrf:
    def test_unsafe_cookie_request_without_csrf_header_is_rejected(self, staff_user):
        client = APIClient(enforce_csrf_checks=True)
        csrf = client.get(reverse("auth-csrf")).cookies["csrftoken"].value

        # Login without header -> rejected
        assert client.post(LOGIN, {"identifier": "staff", "password": PASSWORD}).status_code == 403

        # Login with header -> ok
        ok = client.post(LOGIN, {"identifier": "staff", "password": PASSWORD}, HTTP_X_CSRFTOKEN=csrf)
        assert ok.status_code == 200

        # Authenticated unsafe call without header -> rejected
        assert client.patch(ME, {"job_title": "x"}).status_code == 403
        assert client.patch(ME, {"job_title": "x"}, HTTP_X_CSRFTOKEN=csrf).status_code == 200


class TestPasswords:
    def test_change_password_revokes_other_sessions(self, api_client, staff_user):
        api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        other_device = APIClient()
        other_device.post(LOGIN, {"identifier": "staff", "password": PASSWORD})

        response = api_client.post(
            reverse("auth-password-change"),
            {
                "current_password": PASSWORD,
                "new_password": "N3w!Passw0rd",
                "new_password_confirm": "N3w!Passw0rd",
            },
        )
        assert response.status_code == 200
        assert other_device.post(REFRESH).status_code == 401
        assert api_client.get(ME).status_code == 200

    def test_change_password_wrong_current(self, api_client, staff_user):
        api_client.post(LOGIN, {"identifier": "staff", "password": PASSWORD})
        response = api_client.post(
            reverse("auth-password-change"),
            {
                "current_password": "bad",
                "new_password": "N3w!Passw0rd",
                "new_password_confirm": "N3w!Passw0rd",
            },
        )
        assert response.status_code == 400
        assert "current_password" in response.data["error"]["details"]

    def test_password_reset_flow(self, api_client, staff_user):
        response = api_client.post(reverse("auth-password-reset"), {"email": "staff@stockflow.test"})
        assert response.status_code == 200
        assert len(mail.outbox) == 1
        uid, token = re.search(r"uid=([\w-]+)&token=([\w-]+)", mail.outbox[0].body).groups()

        confirm = api_client.post(
            reverse("auth-password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "new_password": "Res3t!Passw0rd",
                "new_password_confirm": "Res3t!Passw0rd",
            },
        )
        assert confirm.status_code == 200
        staff_user.refresh_from_db()
        assert staff_user.check_password("Res3t!Passw0rd")

        reused = api_client.post(
            reverse("auth-password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "new_password": "An0ther!Pass",
                "new_password_confirm": "An0ther!Pass",
            },
        )
        assert reused.status_code == 400

    def test_password_reset_unknown_email_is_silent(self, api_client, db):
        response = api_client.post(reverse("auth-password-reset"), {"email": "ghost@nowhere.com"})
        assert response.status_code == 200
        assert len(mail.outbox) == 0


class TestAvailability:
    def test_username_and_email(self, api_client, staff_user):
        url = reverse("auth-availability")
        assert api_client.get(url, {"username": "STAFF"}).data["available"] is False
        assert api_client.get(url, {"username": "fresh"}).data["available"] is True
        assert api_client.get(url, {"email": "staff@stockflow.test"}).data["available"] is False
        assert api_client.get(url).status_code == 400


class TestProfileAndUsers:
    def test_update_profile(self, client_for, staff_user):
        response = client_for(staff_user).patch(ME, {"first_name": "Sam", "job_title": "Cashier"})
        assert response.status_code == 200
        assert response.data["full_name"] == "Sam"

    def test_users_endpoint_admin_only(self, client_for, staff_user, admin_user):
        assert client_for(staff_user).get("/api/v1/users/").status_code == 403
        response = client_for(admin_user).get("/api/v1/users/")
        assert response.status_code == 200
        assert response.data["count"] == 2

    def test_admin_creates_user_and_cannot_demote_self(self, client_for, admin_user):
        client = client_for(admin_user)
        created = client.post(
            "/api/v1/users/",
            {"username": "newbie", "email": "newbie@x.com", "password": "G00d!Passw0rd", "role": "MANAGER"},
        )
        assert created.status_code == 201, created.data
        assert User.objects.get(username="newbie").check_password("G00d!Passw0rd")

        demote = client.patch(f"/api/v1/users/{admin_user.pk}/", {"role": "STAFF"})
        assert demote.status_code == 400

    def test_user_stats(self, client_for, admin_user, staff_user):
        data = client_for(admin_user).get("/api/v1/users/stats/").data
        assert data["total"] == 2 and data["admins"] == 1 and data["staff"] == 1
