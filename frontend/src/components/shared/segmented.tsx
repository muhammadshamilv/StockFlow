import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: ReactNode; count?: number }

type SegmentedProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/** Pill segmented control (range pickers, status filters, payment method). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "bg-muted inline-flex max-w-full scrollbar-thin items-center gap-1 overflow-x-auto rounded-xl p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              active && "bg-surface text-foreground shadow-sm",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-[11px]",
                  active ? "bg-primary/12 text-primary" : "bg-foreground/8",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
