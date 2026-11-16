from django.http import HttpResponse
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from . import selectors, services
from .filters import CustomerFilter, SaleFilter
from .invoice_pdf import render_invoice
from .models import Sale
from .serializers import (
    CustomerOptionSerializer,
    CustomerSerializer,
    SaleCancelSerializer,
    SaleCreateSerializer,
    SaleDetailSerializer,
    SaleListSerializer,
    SalesSummarySerializer,
)


class CanManageCustomers(BasePermission):
    """Everyone can read/create/edit customers at the counter; only managers delete."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method == "DELETE":
            return request.user.is_manager_or_above
        return True


@extend_schema(tags=["Customers"])
class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [CanManageCustomers]
    filterset_class = CustomerFilter
    search_fields = ["name", "email", "phone", "tax_id"]
    ordering_fields = ["name", "total_spent", "orders_count", "last_purchase_at", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return selectors.customer_queryset()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    @extend_schema(responses=CustomerOptionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="options", pagination_class=None)
    def options_list(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True)[:30]
        return Response(CustomerOptionSerializer(queryset, many=True).data)

    @extend_schema(responses=SaleListSerializer(many=True))
    @action(detail=True, methods=["get"])
    def sales(self, request, pk=None):
        customer = self.get_object()
        queryset = selectors.sale_list_queryset().filter(customer=customer)
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(SaleListSerializer(page, many=True).data)


class SalePermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if view.action == "cancel":
            return request.user.is_manager_or_above
        return True


@extend_schema(tags=["Sales"])
class SaleViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Sales are never edited or deleted – they are cancelled (stock is returned)."""

    permission_classes = [SalePermission]
    filterset_class = SaleFilter
    search_fields = ["invoice_number", "customer__name", "customer__phone", "items__product_name"]
    ordering_fields = ["created_at", "total", "invoice_number"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        if self.action == "list":
            return selectors.sale_list_queryset()
        return selectors.sale_detail_queryset()

    def get_serializer_class(self):
        return SaleListSerializer if self.action == "list" else SaleDetailSerializer

    def filter_queryset(self, queryset):
        # Item search can create duplicates – keep rows unique
        return super().filter_queryset(queryset).distinct()

    @extend_schema(request=SaleCreateSerializer, responses={201: SaleDetailSerializer})
    def create(self, request, *args, **kwargs):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = services.create_sale(user=request.user, **serializer.validated_data)
        sale = selectors.sale_detail_queryset().get(pk=sale.pk)
        return Response(
            SaleDetailSerializer(sale, context={"request": request}).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(request=SaleCancelSerializer, responses=SaleDetailSerializer)
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        serializer = SaleCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = services.cancel_sale(sale=self.get_object(), user=request.user, **serializer.validated_data)
        sale = selectors.sale_detail_queryset().get(pk=sale.pk)
        return Response(SaleDetailSerializer(sale, context={"request": request}).data)

    @extend_schema(responses={(200, "application/pdf"): OpenApiResponse(description="Invoice PDF")})
    @action(detail=True, methods=["get"])
    def invoice(self, request, pk=None):
        sale = self.get_object()
        disposition = "attachment" if request.query_params.get("download") == "1" else "inline"
        response = HttpResponse(render_invoice(sale), content_type="application/pdf")
        response["Content-Disposition"] = f'{disposition}; filename="{sale.invoice_number}.pdf"'
        return response

    @extend_schema(responses=SalesSummarySerializer)
    @action(detail=False, methods=["get"], pagination_class=None)
    def summary(self, request):
        """KPIs for the current filters (e.g. ?date_from=2026-11-01&date_to=2026-11-30)."""
        queryset = SaleFilter(request.query_params, queryset=Sale.objects.all()).qs
        return Response(SalesSummarySerializer(selectors.sales_summary(queryset)).data)
