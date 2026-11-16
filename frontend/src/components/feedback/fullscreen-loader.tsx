import { Logo } from "@/components/shared/logo"
import { cn } from "@/lib/utils"

import { PulseDots } from "./pulse-dots"

type FullscreenLoaderProps = { message?: string; overlay?: boolean; className?: string }

/** Full-screen loader: app boot, session restore and lazy route loading. */
export function FullscreenLoader({
  message = "Loading…",
  overlay = false,
  className,
}: FullscreenLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "bg-dot-grid flex flex-col items-center justify-center gap-6",
        overlay ? "glass fixed inset-0 z-[100]" : "bg-background min-h-dvh",
        className,
      )}
    >
      <div className="relative grid size-20 place-items-center">
        <span className="bg-primary/25 absolute inset-0 rounded-3xl blur-2xl" />
        <svg
          viewBox="0 0 80 80"
          className="absolute inset-0 size-full animate-spin [animation-duration:1.4s]"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="3"
          />
          <path
            d="M76 40A36 36 0 0 0 40 4"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <Logo iconOnly size="lg" />
      </div>
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span>{message}</span>
        <PulseDots size="sm" />
      </div>
    </div>
  )
}
