import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type BarListItem = {
  key: string | number
  label: ReactNode
  value: number
  display: string
  hint?: string
  dot?: string
}

/**
 * Horizontal bar list – one series, one hue, sorted; the value is printed
 * beside each bar so identity never depends on colour.
 */
export function BarList({
  items,
  emptyText = "No data for this period",
}: {
  items: BarListItem[]
  emptyText?: string
}) {
  if (!items.length) return <p className="text-muted-foreground py-10 text-center text-sm">{emptyText}</p>
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="group cursor-default">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {item.dot && (
                      <span className="size-2 shrink-0 rounded-full" style={{ background: item.dot }} />
                    )}
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="tabular shrink-0 font-medium">{item.display}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-series-1 h-full rounded-full transition-[width,opacity] duration-500 group-hover:opacity-80"
                    style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            {item.hint && <TooltipContent side="top">{item.hint}</TooltipContent>}
          </Tooltip>
        </li>
      ))}
    </ul>
  )
}
