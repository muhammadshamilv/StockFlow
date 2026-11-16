import { cn } from "@/lib/utils"

type ProgressBarProps = {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number
  label?: string
  showValue?: boolean
  size?: "xs" | "sm" | "md"
  tone?: "primary" | "success" | "warning" | "destructive"
  className?: string
}

const heights = { xs: "h-1", sm: "h-1.5", md: "h-2.5" }
const tones = {
  primary: "bg-primary shadow-[0_0_12px_var(--primary)]",
  success: "bg-success shadow-[0_0_10px_var(--success)]",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

/** Determinate ("Uploading file… 72%") or indeterminate progress bar with a soft glow. */
export function ProgressBar({
  value,
  label,
  showValue = true,
  size = "sm",
  tone = "primary",
  className,
}: ProgressBarProps) {
  const indeterminate = value === undefined
  const clamped = Math.min(100, Math.max(0, value ?? 0))

  return (
    <div className={cn("w-full", className)}>
      {(label || (showValue && !indeterminate)) && (
        <div className="mb-2 flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showValue && !indeterminate && (
            <span className="text-primary tabular font-mono text-xs">{Math.round(clamped)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
        aria-label={label}
        className={cn("bg-muted relative w-full overflow-hidden rounded-full", heights[size])}
      >
        {indeterminate ? (
          <div
            className={cn(
              "animate-indeterminate absolute inset-y-0 left-0 w-1/2 origin-left rounded-full",
              tones[tone],
            )}
          />
        ) : (
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  )
}
