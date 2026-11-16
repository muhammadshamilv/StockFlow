"""
Auth endpoints (all under /api/v1/auth/).

Flow for the SPA:
  1. GET  csrf/              -> sets the `csrftoken` cookie
  2. POST register/          -> creates the account (no auto login)
  3. POST login/             -> sets httpOnly `sf_access` + `sf_refresh` cookies
  4. GET  me/                -> current user (cookie auth)
  5. POST refresh/           -> rotates both cookies when access expires (401)
  6. POST logout/            -> blacklists refresh token, clears cookies

Every unsafe request must send the `X-CSRFToken` header.
"""

import django_filters
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import exceptions, mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdmin
from apps.core.signals import emit_activity

from . import services
from .authentication import enforce_csrf
from .cookies import clear_auth_cookies, get_refresh_cookie, set_auth_cookies
from .models import User
from .serializers import (
    AdminUserSerializer,
    AvailabilityQuerySerializer,
    AvailabilityResultSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

MessageSerializer = inline_serializer("Message", {"detail": serializers.CharField()})
AuthUserSerializer = inline_serializer("AuthUser", {"user": UserSerializer()})


class PublicAuthView(APIView):
    """
    Public endpoint: skips JWT auth (a stale cookie must never block login),
    but still enforces CSRF because cookies are involved.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            enforce_csrf(request)


def _auth_response(user: User, pair: services.TokenPair, *, status_code=status.HTTP_200_OK) -> Response:
    response = Response({"user": UserSerializer(user).data}, status=status_code)
    set_auth_cookies(
        response,
        access=pair.access,
        refresh=pair.refresh,
        refresh_lifetime=pair.refresh_lifetime,
        remember=pair.remember,
    )
    return response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(PublicAuthView):
    throttle_scope = None

    @extend_schema(tags=["Auth"], responses=MessageSerializer, summary="Set CSRF cookie")
    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


class RegisterView(PublicAuthView):
    @extend_schema(
        tags=["Auth"],
        request=RegisterSerializer,
        responses={
            201: inline_serializer(
                "RegisterResponse", {"detail": serializers.CharField(), "user": UserSerializer()}
            )
        },
        summary="Create an account",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Account created successfully. You can now sign in.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(PublicAuthView):
    @extend_schema(tags=["Auth"], request=LoginSerializer, responses=AuthUserSerializer, summary="Sign in")
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        pair = services.login(request=request, user=user, remember=serializer.validated_data["remember_me"])
        return _auth_response(user, pair)


class RefreshView(PublicAuthView):
    throttle_scope = None

    @extend_schema(tags=["Auth"], request=None, responses=AuthUserSerializer, summary="Rotate auth cookies")
    def post(self, request):
        try:
            user, pair = services.rotate_refresh_token(get_refresh_cookie(request))
        except exceptions.NotAuthenticated:
            response = Response(
                {"error": {"code": "session_expired", "message": "Session expired. Please log in again."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response
        return _auth_response(user, pair)


class LogoutView(PublicAuthView):
    throttle_scope = None

    @extend_schema(tags=["Auth"], request=None, responses={204: None}, summary="Sign out")
    def post(self, request):
        services.logout(request=request, raw_refresh=get_refresh_cookie(request))
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class AvailabilityView(PublicAuthView):
    throttle_scope = "availability"

    @extend_schema(
        tags=["Auth"],
        parameters=[
            OpenApiParameter("username", str, required=False),
            OpenApiParameter("email", str, required=False),
        ],
        responses=AvailabilityResultSerializer,
        summary="Live username / email availability check",
    )
    def get(self, request):
        query = AvailabilityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        if username := query.validated_data.get("username"):
            taken = User.objects.filter(username__iexact=username.strip()).exists()
            result = {
                "field": "username",
                "value": username,
                "available": not taken,
                "message": "Username is taken." if taken else "Username is available.",
            }
        else:
            email = query.validated_data["email"].strip()
            taken = User.objects.filter(email__iexact=email).exists()
            result = {
                "field": "email",
                "value": email,
                "available": not taken,
                "message": "Email is already registered." if taken else "Email is available.",
            }
        return Response(result)


class PasswordResetRequestView(PublicAuthView):
    throttle_scope = "password_reset"

    @extend_schema(tags=["Auth"], request=PasswordResetRequestSerializer, responses=MessageSerializer)
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.send_password_reset_email(email=serializer.validated_data["email"])
        return Response({"detail": "If an account exists for that email, a reset link is on its way."})


class PasswordResetConfirmView(PublicAuthView):
    @extend_schema(tags=["Auth"], request=PasswordResetConfirmSerializer, responses=MessageSerializer)
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reset_password(
            user=serializer.validated_data["user"], new_password=serializer.validated_data["new_password"]
        )
        return Response({"detail": "Password updated. You can now sign in with your new password."})


# --------------------------------------------------------------------------- #
# Authenticated
# --------------------------------------------------------------------------- #
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(tags=["Profile"], responses=UserSerializer, summary="Current user")
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(
        tags=["Profile"], request=ProfileUpdateSerializer, responses=UserSerializer, summary="Update profile"
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        emit_activity(actor=user, verb="profile.updated", target=user)
        return Response(UserSerializer(user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Profile"], request=ChangePasswordSerializer, responses=AuthUserSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        services.change_password(user=user, new_password=serializer.validated_data["new_password"])
        # Other devices are logged out; keep this session alive with fresh cookies
        pair = services.issue_tokens(user, remember=False)
        return _auth_response(user, pair)


class UserFilter(django_filters.FilterSet):
    role = django_filters.ChoiceFilter(choices=User.Role.choices)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = User
        fields = ["role", "is_active"]


@extend_schema(tags=["Users"])
class UserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Admin-only user management. Users are deactivated, never deleted."""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_class = UserFilter
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "last_login", "username", "role"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return User.objects.all()

    def perform_create(self, serializer):
        user = serializer.save()
        emit_activity(actor=self.request.user, verb="user.created", target=user, metadata={"role": user.role})

    def perform_update(self, serializer):
        user = serializer.save()
        emit_activity(
            actor=self.request.user,
            verb="user.updated",
            target=user,
            metadata={k: v for k, v in serializer.validated_data.items() if k != "password"},
        )

    @extend_schema(
        responses=inline_serializer(
            "UserStats",
            {
                "total": serializers.IntegerField(),
                "active": serializers.IntegerField(),
                "admins": serializers.IntegerField(),
                "managers": serializers.IntegerField(),
                "staff": serializers.IntegerField(),
            },
        )
    )
    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = User.objects.all()
        return Response(
            {
                "total": qs.count(),
                "active": qs.filter(is_active=True).count(),
                "admins": qs.filter(role=User.Role.ADMIN).count(),
                "managers": qs.filter(role=User.Role.MANAGER).count(),
                "staff": qs.filter(role=User.Role.STAFF).count(),
            }
        )
