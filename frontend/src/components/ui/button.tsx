import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Spinner } from "@/components/feedback/spinner"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-visible:ring-ring/40 aria-invalid:ring-destructive/30 relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-[background-color,box-shadow,transform,color,opacity] duration-150 outline-none select-none focus-visible:ring-3 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_8px_24px_-10px_var(--primary)] hover:shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_10px_30px_-8px_var(--primary)]",
        gradient:
          "bg-brand-gradient text-white shadow-[0_1px_0_0_rgb(255_255_255/0.22)_inset,0_10px_30px_-10px_var(--primary)] hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border-input hover:bg-accent hover:text-accent-foreground border bg-transparent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        soft: "bg-primary/12 text-primary hover:bg-primary/18 dark:text-[oklch(0.8_0.12_256)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-soft": "bg-destructive/12 text-destructive hover:bg-destructive/20",
        link: "text-primary h-auto px-0 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 rounded-md px-2.5 text-xs",
        sm: "h-8 px-3 text-[13px]",
        default: "h-10 px-4",
        lg: "h-11 px-5 text-[15px]",
        xl: "h-12 rounded-xl px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-xs": "size-7 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, disables the button and (optionally) swaps the label. */
    loading?: boolean
    loadingText?: string
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {children}
      </Slot.Root>
    )
  }
  return (
    <button
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export { Button, buttonVariants, type ButtonProps }
