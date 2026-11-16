from django.apps import AppConfig


class ActivityConfig(AppConfig):
    name = "apps.activity"
    label = "activity"
    verbose_name = "Activity & notifications"

    def ready(self) -> None:
        from . import receivers  # noqa: F401  (connects signal handlers)
