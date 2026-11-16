from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models
from django.db.models.functions import Lower


class UserManager(DjangoUserManager):
    def _normalize(self, email: str | None) -> str:
        return self.normalize_email(email or "").lower()

    def create_user(self, username, email=None, password=None, **extra_fields):
        return super().create_user(username, self._normalize(email), password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        return super().create_superuser(username, self._normalize(email), password, **extra_fields)


class User(AbstractUser):
    """StockFlow user with a business role. Log in with username OR email."""

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        MANAGER = "MANAGER", "Manager"
        STAFF = "STAFF", "Staff"

    email = models.EmailField("email address", unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STAFF, db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    job_title = models.CharField(max_length=80, blank=True)
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)

    REQUIRED_FIELDS = ["email"]

    objects = UserManager()

    class Meta:
        ordering = ["-date_joined"]
        constraints = [
            models.UniqueConstraint(Lower("username"), name="user_username_ci_unique"),
            models.UniqueConstraint(Lower("email"), name="user_email_ci_unique"),
        ]

    def __str__(self) -> str:
        return self.username

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)

    @property
    def full_name(self) -> str:
        return self.get_full_name() or self.username

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    @property
    def is_manager_or_above(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.MANAGER)
