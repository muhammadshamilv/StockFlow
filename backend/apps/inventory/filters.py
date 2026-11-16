import django_filters

from .models import StockMovement


class StockMovementFilter(django_filters.FilterSet):
    movement_type = django_filters.MultipleChoiceFilter(choices=StockMovement.Type.choices)
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    direction = django_filters.ChoiceFilter(choices=[("in", "In"), ("out", "Out")], method="filter_direction")

    class Meta:
        model = StockMovement
        fields = ["product", "movement_type", "created_by"]

    def filter_direction(self, queryset, name, value):
        from django.db.models import F

        if value == "in":
            return queryset.filter(quantity_after__gt=F("quantity_before"))
        return queryset.filter(quantity_after__lt=F("quantity_before"))
