from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsManagerOrAdmin

from .filters import ActivityLogFilter, NotificationFilter
from .models import ActivityLog, Notification
from .serializers import ActivityLogSerializer, NotificationSerializer

CountSerializer = inline_serializer("Count", {"count": serializers.IntegerField()})


@extend_schema(tags=["Activity"])
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsManagerOrAdmin]
    filterset_class = ActivityLogFilter
    search_fields = ["target_repr", "verb", "actor__username", "actor__first_name", "actor__last_name"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        return ActivityLog.objects.select_related("actor")


@extend_schema(tags=["Notifications"])
class NotificationViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    filterset_class = NotificationFilter
    search_fields = ["title", "message"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # schema generation
            return Notification.objects.none()
        return Notification.objects.filter(recipient=self.request.user)

    @extend_schema(responses=CountSerializer)
    @action(detail=False, methods=["get"], url_path="unread-count", pagination_class=None, filter_backends=[])
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(is_read=False).count()})

    @extend_schema(request=None, responses=NotificationSerializer)
    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])
        return Response(NotificationSerializer(notification).data)

    @extend_schema(request=None, responses=CountSerializer)
    @action(detail=False, methods=["post"], url_path="read-all", filter_backends=[])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({"count": updated})

    @extend_schema(request=None, responses={204: None})
    @action(detail=False, methods=["post"], url_path="clear-read", filter_backends=[])
    def clear_read(self, request):
        self.get_queryset().filter(is_read=True).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
