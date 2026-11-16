import django_filters

from .models import Customer, Sale


class SaleFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Sale.Status.choices)
    payment_method = django_filters.MultipleChoiceFilter(choices=Sale.PaymentMethod.choices)
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    min_total = django_filters.NumberFilter(field_name="total", lookup_expr="gte")
    max_total = django_filters.NumberFilter(field_name="total", lookup_expr="lte")
    walk_in = django_filters.BooleanFilter(field_name="customer", lookup_expr="isnull")

    class Meta:
        model = Sale
        fields = ["status", "payment_method", "customer", "created_by"]


class CustomerFilter(django_filters.FilterSet):
    class Meta:
        model = Customer
        fields = ["is_active"]
