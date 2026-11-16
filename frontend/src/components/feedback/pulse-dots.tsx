import { cn } from "@/lib/utils"

type PulseDotsProps = { className?: string; size?: "sm" | "md" | "lg"; label?: string }

const sizes = { sm: "size-1.5 gap-1", md: "size-2 gap-1.5", lg: "size-3 gap-2" }

/** Three pulsing dots – "something is happening" (checking, syncing, typing). */
export function PulseDots({ className, size = "md", label = "Loading" }: PulseDotsProps) {
  const [dot, gap] = sizes[size].split(" ")
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("text-primary inline-flex items-center", gap, className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("animate-pulse-dot rounded-full bg-current", dot)}
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  )
}

/** A single live/pulsing status dot (e.g. "Live" indicator, unread badge). */
export function LiveDot({
  className,
  tone = "success",
}: {
  className?: string
  tone?: "success" | "primary" | "destructive"
}) {
  const color = { success: "bg-success", primary: "bg-primary", destructive: "bg-destructive" }[tone]
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", color)} />
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  )
}
