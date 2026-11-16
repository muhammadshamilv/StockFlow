import django_filters

from .models import ActivityLog, Notification


class ActivityLogFilter(django_filters.FilterSet):
    verb_prefix = django_filters.CharFilter(field_name="verb", lookup_expr="startswith")
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = ActivityLog
        fields = ["actor", "verb", "target_type", "target_id"]


class NotificationFilter(django_filters.FilterSet):
    level = django_filters.MultipleChoiceFilter(choices=Notification.Level.choices)

    class Meta:
        model = Notification
        fields = ["is_read", "kind", "level"]
