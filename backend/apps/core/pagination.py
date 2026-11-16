import math

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Page-number pagination with a rich envelope the SPA can use for both
    numbered tables and infinite scroll:

        { count, page, page_size, total_pages, next, previous, results }
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        page_size = self.get_page_size(self.request) or self.page_size
        count = self.page.paginator.count
        return Response(
            {
                "count": count,
                "page": self.page.number,
                "page_size": page_size,
                "total_pages": max(1, math.ceil(count / page_size)),
                "next": self.page.next_page_number() if self.page.has_next() else None,
                "previous": (self.page.previous_page_number() if self.page.has_previous() else None),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "required": ["count", "page", "page_size", "total_pages", "results"],
            "properties": {
                "count": {"type": "integer"},
                "page": {"type": "integer"},
                "page_size": {"type": "integer"},
                "total_pages": {"type": "integer"},
                "next": {"type": "integer", "nullable": True},
                "previous": {"type": "integer", "nullable": True},
                "results": schema,
            },
        }
