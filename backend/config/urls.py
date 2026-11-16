"""
Root URL configuration.

    /admin/              Django admin
    /api/v1/...          REST API
    /api/docs/           Swagger UI
    /api/redoc/          ReDoc
    /api/schema/         OpenAPI schema (YAML/JSON)
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.accounts.urls import auth_urlpatterns
from apps.core.views import HealthCheckView

admin.site.site_header = "StockFlow Administration"
admin.site.site_title = "StockFlow Admin"
admin.site.index_title = "Control panel"

api_v1 = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path("auth/", include(auth_urlpatterns)),
    path("", include("apps.accounts.urls")),
    path("", include("apps.catalog.urls")),
    path("", include("apps.inventory.urls")),
    path("", include("apps.sales.urls")),
    path("", include("apps.activity.urls")),
    path("", include("apps.analytics.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
