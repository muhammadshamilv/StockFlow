from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Liveness + database check, used by Docker / uptime monitors."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["System"],
        responses=inline_serializer(
            "HealthCheck",
            {"status": serializers.CharField(), "database": serializers.CharField()},
        ),
    )
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_status = "ok"
        except Exception:  # pragma: no cover - only when DB is down
            db_status = "unavailable"
        code = 200 if db_status == "ok" else 503
        return Response({"status": "ok" if code == 200 else "degraded", "database": db_status}, status=code)
