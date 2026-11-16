import { CheckIcon, XIcon } from "lucide-react"

import { PASSWORD_RULES, passwordStrength } from "@/lib/password"
import { cn } from "@/lib/utils"

const toneBar = {
  muted: "bg-muted-foreground/30",
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
}
const toneText = {
  muted: "text-muted-foreground",
  destructive: "text-destructive",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
}

/** 4-segment strength meter + live rule checklist. */
export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const strength = passwordStrength(value)
  return (
    <div className={cn("space-y-2.5", className)} aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1.5 rounded-full transition-colors duration-300",
                strength.score >= segment ? toneBar[strength.tone] : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className={cn("w-16 text-right text-xs font-medium", toneText[strength.tone])}>
          {value ? strength.label : ""}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value)
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                ok ? "text-success" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-3.5 place-items-center rounded-full",
                  ok ? "bg-success/15" : "bg-muted",
                )}
              >
                {ok ? (
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                ) : (
                  <XIcon className="size-2.5 opacity-60" />
                )}
              </span>
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
