import django_filters
from django.db.models import F

from .models import Category, Product


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    """?category=1,2,3"""


class CategoryFilter(django_filters.FilterSet):
    class Meta:
        model = Category
        fields = ["is_active"]


class ProductFilter(django_filters.FilterSet):
    category = NumberInFilter(field_name="category_id")
    stock_status = django_filters.ChoiceFilter(
        choices=Product.StockStatus.choices, method="filter_stock_status"
    )
    min_price = django_filters.NumberFilter(field_name="selling_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="selling_price", lookup_expr="lte")
    is_active = django_filters.BooleanFilter()
    unit = django_filters.ChoiceFilter(choices=Product.Unit.choices)

    class Meta:
        model = Product
        fields = ["category", "stock_status", "is_active", "unit"]

    def filter_stock_status(self, queryset, name, value):
        if value == Product.StockStatus.OUT_OF_STOCK:
            return queryset.filter(quantity=0)
        if value == Product.StockStatus.LOW_STOCK:
            return queryset.filter(quantity__gt=0, quantity__lte=F("reorder_level"))
        return queryset.filter(quantity__gt=F("reorder_level"))
