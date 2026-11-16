import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  /** Icon or element rendered inside the field, on the left */
  startAdornment?: React.ReactNode
  /** Icon or element rendered inside the field, on the right */
  endAdornment?: React.ReactNode
}

const fieldBase =
  "w-full min-w-0 rounded-lg border border-input bg-surface text-[15px] text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/70 hover:border-foreground/20 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/12 sm:text-sm dark:bg-surface/60"

function Input({ className, type, startAdornment, endAdornment, ...props }: InputProps) {
  if (!startAdornment && !endAdornment) {
    return (
      <input type={type} data-slot="input" className={cn(fieldBase, "h-10 px-3", className)} {...props} />
    )
  }
  return (
    <div className="relative" data-slot="input-wrapper">
      {startAdornment && (
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center [&_svg]:size-4">
          {startAdornment}
        </span>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(fieldBase, "h-10 px-3", startAdornment && "pl-9", endAdornment && "pr-10", className)}
        {...props}
      />
      {endAdornment && <span className="absolute inset-y-0 right-1.5 flex items-center">{endAdornment}</span>}
    </div>
  )
}

export { Input, fieldBase, type InputProps }
