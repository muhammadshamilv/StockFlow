import { useState, type Ref } from "react"
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react"

import { Input, type InputProps } from "@/components/ui/input"
import { useCapsLock } from "@/hooks/use-caps-lock"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<InputProps, "type" | "endAdornment"> & {
  showCapsLockHint?: boolean
  ref?: Ref<HTMLInputElement>
}

/** Password field with show/hide toggle and Caps Lock warning. */
export function PasswordInput({
  showCapsLockHint = true,
  className,
  onKeyDown,
  onKeyUp,
  onBlur,
  ref,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const caps = useCapsLock()

  return (
    <div className="space-y-1.5">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        startAdornment={<LockIcon />}
        className={cn("font-medium tracking-wide", !visible && props.value && "tracking-[0.2em]", className)}
        onKeyDown={(e) => {
          caps.handleKey(e)
          onKeyDown?.(e)
        }}
        onKeyUp={(e) => {
          caps.handleKey(e)
          onKeyUp?.(e)
        }}
        onBlur={(e) => {
          caps.reset()
          onBlur?.(e)
        }}
        endAdornment={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-8 place-items-center rounded-md transition"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
          >
            {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        }
        {...props}
      />
      {showCapsLockHint && caps.on && (
        <p className="text-warning animate-fade-up flex items-center gap-1.5 text-xs font-medium">
          <span className="bg-warning/15 grid size-4 place-items-center rounded text-[10px]">⇪</span>
          Caps Lock is on
        </p>
      )}
    </div>
  )
}
