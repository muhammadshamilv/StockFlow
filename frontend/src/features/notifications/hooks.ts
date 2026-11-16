import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import { notificationsApi } from "./api"

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
    meta: { errorMessage: false },
  })
}

/** Infinite list – powers the bell popover (and the full page in Phase 4). */
export function useNotificationsFeed(filters: { is_read?: boolean } = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: ({ pageParam }) => notificationsApi.list({ ...filters, page: pageParam, page_size: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
  })
}

export function useMarkNotificationRead() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useClearReadNotifications() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.clearRead,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    meta: { successMessage: "Read notifications cleared" },
  })
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      client.setQueryData(queryKeys.notifications.unread, 0)
      return client.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
    meta: { successMessage: "All caught up!" },
  })
}
