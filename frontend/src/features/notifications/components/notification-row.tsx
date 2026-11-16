import { AlertOctagonIcon, PackageCheckIcon, TriangleAlertIcon, UserPlusIcon } from "lucide-react"

import { timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { Notification } from "../api"

const kindIcon = {
  LOW_STOCK: TriangleAlertIcon,
  OUT_OF_STOCK: AlertOctagonIcon,
  RESTOCKED: PackageCheckIcon,
  NEW_USER: UserPlusIcon,
}
const levelTone = {
  INFO: "bg-info/12 text-info",
  SUCCESS: "bg-success/12 text-success",
  WARNING: "bg-warning/15 text-warning",
  CRITICAL: "bg-destructive/12 text-destructive",
}

export function NotificationRow({ item, onOpen }: { item: Notification; onOpen: (n: Notification) => void }) {
  const Icon = kindIcon[item.kind]
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "hover:bg-accent/70 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition",
        !item.is_read && "bg-primary/[0.04]",
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", levelTone[item.level])}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("line-clamp-1 flex-1 text-sm", !item.is_read && "font-semibold")}>
            {item.title}
          </span>
          {!item.is_read && (
            <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full shadow-[0_0_8px_var(--primary)]" />
          )}
        </span>
        <span className="text-muted-foreground line-clamp-2 text-xs">{item.message}</span>
        <span className="text-muted-foreground/80 mt-1 block text-[11px]">{timeAgo(item.created_at)}</span>
      </span>
    </button>
  )
}
