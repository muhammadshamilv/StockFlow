import { cn } from "@/lib/utils"

type LogoProps = { iconOnly?: boolean; size?: "sm" | "md" | "lg"; className?: string }

const box = { sm: "size-7 rounded-lg", md: "size-9 rounded-xl", lg: "size-11 rounded-2xl" }
const text = { sm: "text-base", md: "text-lg", lg: "text-2xl" }

export function Logo({ iconOnly = false, size = "md", className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "bg-brand-gradient relative grid shrink-0 place-items-center text-white shadow-[0_6px_20px_-6px_var(--primary)]",
          box[size],
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[55%]"
        >
          <path d="M3 16.5 8.5 11l3.5 3.5L20 6.5" />
          <path d="M14.5 6.5H20V12" />
        </svg>
      </span>
      {!iconOnly && (
        <span className={cn("font-semibold tracking-tight", text[size])}>
          Stock<span className="text-gradient">Flow</span>
        </span>
      )}
    </span>
  )
}
