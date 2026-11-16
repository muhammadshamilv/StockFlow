import { useId, type ReactNode } from "react"
import { AlertCircleIcon } from "lucide-react"
import type { FieldError } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type FormFieldProps = {
  label: ReactNode
  error?: FieldError | { message?: string }
  hint?: ReactNode
  /** Rendered on the right of the label row (e.g. "Forgot password?") */
  labelAside?: ReactNode
  required?: boolean
  className?: string
  /** Receives the generated id + aria props so label & errors are linked */
  children: (field: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode
}

/** Label + control + animated error/hint, fully wired for screen readers. */
export function FormField({ label, error, hint, labelAside, required, className, children }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error?.message
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {labelAside}
      </div>
      {children({
        id,
        "aria-invalid": Boolean(message),
        "aria-describedby": message || hint ? messageId : undefined,
      })}
      {message ? (
        <p
          id={messageId}
          role="alert"
          className="text-destructive animate-fade-up flex items-center gap-1.5 text-xs font-medium"
        >
          <AlertCircleIcon className="size-3.5 shrink-0" />
          {message}
        </p>
      ) : hint ? (
        <div id={messageId} className="text-muted-foreground text-xs">
          {hint}
        </div>
      ) : null}
    </div>
  )
}
