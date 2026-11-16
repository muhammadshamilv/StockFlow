from django.contrib.auth import password_validation
from django.core.validators import RegexValidator
from rest_framework import serializers

from . import services
from .models import User

username_validator = RegexValidator(
    regex=r"^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28})[a-zA-Z0-9]$",
    message=(
        "Username must be 3–30 characters: letters, numbers, dots, dashes or underscores, "
        "and must start and end with a letter or number."
    ),
)


def _validate_new_password(attrs: dict, *, user: User | None, field: str = "new_password") -> dict:
    confirm_field = f"{field}_confirm"
    if attrs[field] != attrs.pop(confirm_field):
        raise serializers.ValidationError({confirm_field: ["Passwords do not match."]})
    try:
        password_validation.validate_password(attrs[field], user=user)
    except Exception as exc:  # django ValidationError
        raise serializers.ValidationError({field: list(exc.messages)}) from exc
    return attrs


# --------------------------------------------------------------------------- #
# Read models
# --------------------------------------------------------------------------- #
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    initials = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "initials",
            "role",
            "role_display",
            "phone",
            "job_title",
            "avatar",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields

    def get_initials(self, obj: User) -> str:
        parts = [p for p in (obj.first_name, obj.last_name) if p]
        if parts:
            return "".join(p[0] for p in parts).upper()[:2]
        return obj.username[:2].upper()


# --------------------------------------------------------------------------- #
# Auth flows
# --------------------------------------------------------------------------- #
class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, allow_blank=True, required=False, default="")
    last_name = serializers.CharField(max_length=150, allow_blank=True, required=False, default="")
    username = serializers.CharField(max_length=30, validators=[username_validator])
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})
    password_confirm = serializers.CharField(
        write_only=True, trim_whitespace=False, style={"input_type": "password"}
    )
    accept_terms = serializers.BooleanField(write_only=True)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_accept_terms(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("You must accept the terms to create an account.")
        return value

    def validate(self, attrs):
        probe = User(
            username=attrs["username"],
            email=attrs["email"],
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        attrs = _validate_new_password(attrs, user=probe, field="password")
        attrs.pop("accept_terms", None)
        return attrs

    def create(self, validated_data):
        return services.register_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Username or email address.")
    password = serializers.CharField(trim_whitespace=False, style={"input_type": "password"})
    remember_me = serializers.BooleanField(default=False)

    def validate(self, attrs):
        attrs["user"] = services.authenticate_user(
            request=self.context.get("request"),
            identifier=attrs["identifier"],
            password=attrs["password"],
        )
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)
    new_password_confirm = serializers.CharField(trim_whitespace=False)

    def validate_current_password(self, value: str) -> str:
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Your current password is incorrect.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": ["New password must be different from the current one."]}
            )
        return _validate_new_password(attrs, user=user)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(trim_whitespace=False)
    new_password_confirm = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        user = services.resolve_reset_user(uid=attrs["uid"], token=attrs["token"])
        attrs = _validate_new_password(attrs, user=user)
        attrs["user"] = user
        return attrs


class AvailabilityQuerySerializer(serializers.Serializer):
    username = serializers.CharField(required=False, max_length=30)
    email = serializers.CharField(required=False, max_length=254)

    def validate(self, attrs):
        if not attrs.get("username") and not attrs.get("email"):
            raise serializers.ValidationError("Provide a username or an email to check.")
        return attrs


class AvailabilityResultSerializer(serializers.Serializer):
    field = serializers.ChoiceField(choices=["username", "email"])
    value = serializers.CharField()
    available = serializers.BooleanField()
    message = serializers.CharField()


# --------------------------------------------------------------------------- #
# Profile
# --------------------------------------------------------------------------- #
class ProfileUpdateSerializer(serializers.ModelSerializer):
    remove_avatar = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "phone", "job_title", "avatar", "remove_avatar"]
        extra_kwargs = {"avatar": {"required": False, "allow_null": True}}

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_avatar(self, value):
        if value and value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Avatar must be smaller than 2 MB.")
        return value

    def update(self, instance, validated_data):
        if validated_data.pop("remove_avatar", False) and instance.avatar:
            instance.avatar.delete(save=False)
            instance.avatar = None
        return super().update(instance, validated_data)


# --------------------------------------------------------------------------- #
# Admin user management
# --------------------------------------------------------------------------- #
class AdminUserSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "password"]
        read_only_fields = [
            "id",
            "full_name",
            "initials",
            "role_display",
            "avatar",
            "date_joined",
            "last_login",
        ]
        extra_kwargs = {"username": {"validators": [username_validator]}}

    def validate_username(self, value):
        qs = User.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": ["A password is required for new users."]})
        if attrs.get("password"):
            try:
                password_validation.validate_password(attrs["password"])
            except Exception as exc:
                raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        if self.instance and self.instance.pk == request.user.pk:
            if attrs.get("role", self.instance.role) != User.Role.ADMIN:
                raise serializers.ValidationError({"role": ["You cannot remove your own admin role."]})
            if attrs.get("is_active") is False:
                raise serializers.ValidationError({"is_active": ["You cannot deactivate your own account."]})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
            services.revoke_all_tokens(instance)
        if validated_data.get("is_active") is False:
            services.revoke_all_tokens(instance)
        return instance
