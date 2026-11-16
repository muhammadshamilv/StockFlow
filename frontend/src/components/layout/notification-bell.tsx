import { useState } from "react"
import { BellIcon, CheckCheckIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { InfiniteScroll } from "@/components/feedback/infinite-scroll"
import { SkeletonRows } from "@/components/feedback/skeleton"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Notification } from "@/features/notifications/api"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsFeed,
  useUnreadCount,
} from "@/features/notifications/hooks"
import { NotificationRow } from "@/features/notifications/components/notification-row"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"all" | "unread">("all")
  const navigate = useNavigate()
  const { data: unread = 0 } = useUnreadCount()
  const feed = useNotificationsFeed(tab === "unread" ? { is_read: false } : {}, open)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const items = feed.data?.pages.flatMap((page) => page.results) ?? []

  const openItem = (item: Notification) => {
    if (!item.is_read) markRead.mutate(item.id)
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={`Notifications (${unread} unread)`}
        >
          <BellIcon />
          {unread > 0 && (
            <span className="bg-destructive ring-background absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold text-white ring-2">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,400px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">Notifications</p>
            <p className="text-muted-foreground text-xs">
              {unread ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            disabled={!unread}
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheckIcon /> Mark all read
          </Button>
        </div>
        <div className="px-3 pt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="max-h-[min(60dvh,420px)] scrollbar-thin overflow-y-auto p-2">
          {feed.isPending ? (
            <div className="px-2">
              <SkeletonRows rows={4} />
            </div>
          ) : feed.isError ? (
            <ErrorState error={feed.error} onRetry={feed.refetch} className="py-8" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={BellIcon}
              title="Nothing here yet"
              description="Low-stock and team alerts will show up here."
              className="py-10"
            />
          ) : (
            <>
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={openItem} />
              ))}
              <InfiniteScroll
                hasMore={Boolean(feed.hasNextPage)}
                loading={feed.isFetchingNextPage}
                onLoadMore={feed.fetchNextPage}
                endMessage={items.length > 6 ? "That's everything" : null}
                rootMargin="80px"
              />
            </>
          )}
        </div>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOpen(false)
              navigate("/notifications")
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
