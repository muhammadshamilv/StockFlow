import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BellIcon, CheckCheckIcon, Trash2Icon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { InfiniteScroll } from "@/components/feedback/infinite-scroll"
import { PullToRefresh } from "@/components/feedback/pull-to-refresh"
import { SkeletonRows } from "@/components/feedback/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { Segmented } from "@/components/shared/segmented"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { queryKeys } from "@/lib/query-keys"

import type { Notification } from "../api"
import { NotificationRow } from "../components/notification-row"
import {
  useClearReadNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsFeed,
  useUnreadCount,
} from "../hooks"

export default function NotificationsPage() {
  useDocumentTitle("Notifications")
  const navigate = useNavigate()
  const client = useQueryClient()
  const [tab, setTab] = useState<"all" | "unread">("all")
  const feed = useNotificationsFeed(tab === "unread" ? { is_read: false } : {})
  const { data: unread = 0 } = useUnreadCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const clearRead = useClearReadNotifications()
  const items = feed.data?.pages.flatMap((page) => page.results) ?? []

  const open = (item: Notification) => {
    if (!item.is_read) markRead.mutate(item.id)
    if (item.link) navigate(item.link)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        description="Low-stock alerts and team updates. Managers get stock alerts automatically."
        actions={
          <>
            <Button variant="outline" onClick={() => clearRead.mutate()} loading={clearRead.isPending}>
              <Trash2Icon /> Clear read
            </Button>
            <Button onClick={() => markAll.mutate()} disabled={!unread} loading={markAll.isPending}>
              <CheckCheckIcon /> Mark all read
            </Button>
          </>
        }
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread", count: unread },
        ]}
        aria-label="Filter"
      />
      {feed.isError ? (
        <ErrorState error={feed.error} onRetry={feed.refetch} className="bg-card rounded-2xl border" />
      ) : (
        <PullToRefresh onRefresh={() => client.invalidateQueries({ queryKey: queryKeys.notifications.all })}>
          <div className="bg-card rounded-2xl border p-2">
            {feed.isPending ? (
              <SkeletonRows rows={6} className="px-3" />
            ) : items.length === 0 ? (
              <EmptyState
                icon={BellIcon}
                title={tab === "unread" ? "No unread notifications" : "You're all caught up"}
              />
            ) : (
              <>
                {items.map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={open} />
                ))}
                <InfiniteScroll
                  hasMore={Boolean(feed.hasNextPage)}
                  loading={feed.isFetchingNextPage}
                  onLoadMore={feed.fetchNextPage}
                />
              </>
            )}
          </div>
        </PullToRefresh>
      )}
    </div>
  )
}
