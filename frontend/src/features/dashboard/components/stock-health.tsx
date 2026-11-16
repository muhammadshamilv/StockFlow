import { CheckCircle2Icon, CircleSlashIcon, TriangleAlertIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber } from "@/lib/format"

const PARTS = [
  { key: "in_stock", label: "In stock", color: "var(--status-good)", icon: CheckCircle2Icon },
  { key: "low_stock", label: "Low stock", color: "var(--status-warning)", icon: TriangleAlertIcon },
  { key: "out_of_stock", label: "Out of stock", color: "var(--status-critical)", icon: CircleSlashIcon },
] as const

/** Thin segmented bar (reserved status colours) + icon/label legend with counts. */
export function StockHealth({
  counts,
}: {
  counts: { in_stock: number; low_stock: number; out_of_stock: number }
}) {
  const total = counts.in_stock + counts.low_stock + counts.out_of_stock || 1
  return (
    <div className="space-y-4">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Stock health">
        {PARTS.map((part) =>
          counts[part.key] ? (
            <Tooltip key={part.key}>
              <TooltipTrigger asChild>
                <span
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(counts[part.key] / total) * 100}%`, background: part.color }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {part.label}: {counts[part.key]} products ({Math.round((counts[part.key] / total) * 100)}%)
              </TooltipContent>
            </Tooltip>
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PARTS.map((part) => (
          <div key={part.key} className="bg-surface-2/50 rounded-xl border p-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <part.icon className="size-3.5" style={{ color: part.color }} />
              {part.label}
            </p>
            <p className="tabular mt-1 text-xl font-semibold">{formatNumber(counts[part.key])}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
