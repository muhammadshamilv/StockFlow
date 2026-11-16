import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-5">
        <span className="bg-primary/20 absolute inset-0 rounded-2xl blur-xl" />
        <div className="bg-surface-2 text-primary relative grid size-14 place-items-center rounded-2xl border">
          <Icon className="size-6" />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
