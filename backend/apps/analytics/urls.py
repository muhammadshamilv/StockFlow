from django.urls import path

from . import views

urlpatterns = [
    path("analytics/dashboard/", views.DashboardView.as_view(), name="analytics-dashboard"),
    path("analytics/reports/sales/", views.SalesReportView.as_view(), name="analytics-sales-report"),
]
