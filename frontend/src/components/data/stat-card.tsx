import type { LucideIcon } from "lucide-react"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import type { ReactNode } from "react"

import { SkeletonStat } from "@/components/feedback/skeleton"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: ReactNode
  icon: LucideIcon
  /** % change vs previous period */
  change?: number | null
  hint?: ReactNode
  loading?: boolean
  className?: string
}

/** KPI tile: label, hero number, change vs previous period. */
export function StatCard({ label, value, icon: Icon, change, hint, loading, className }: StatCardProps) {
  if (loading) return <SkeletonStat className={className} />
  const up = (change ?? 0) >= 0
  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-2xl border p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm">{label}</p>
        <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="tabular mt-2 text-[26px] leading-tight font-semibold tracking-tight">{value}</p>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-xs">
        {change !== undefined && change !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {up ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
            {formatPercent(change)}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}
