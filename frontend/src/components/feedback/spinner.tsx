import { cn } from "@/lib/utils"

type SpinnerProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  label?: string
}

const sizes = { xs: "size-3", sm: "size-4", md: "size-6", lg: "size-9", xl: "size-12" }

/** Spinner – an arc that rotates over a faint track (matches the reference design). */
export function Spinner({ size = "sm", className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex shrink-0", sizes[size], className)}>
      <svg viewBox="0 0 24 24" fill="none" className="size-full animate-spin [animation-duration:0.8s]">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
        <path
          d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
