from django.urls import path
from .views import category_list, product_list, dashboard_stats, product_detail, transaction_list, category_detail,sales_list

urlpatterns = [
    path("categories/", category_list),
    path("categories/<int:pk>/", category_detail),
    path("products/", product_list),
    path("products/<int:pk>/", product_detail),
    path("dashboard/", dashboard_stats),
    path("transactions/", transaction_list),
    path("sales/", sales_list),
]
