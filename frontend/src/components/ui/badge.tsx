import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/14 text-primary border-transparent dark:text-[oklch(0.8_0.12_256)]",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "border-border text-foreground/80",
        success: "bg-success/14 text-success border-transparent",
        warning: "bg-warning/16 dark:text-warning border-transparent text-[oklch(0.55_0.13_70)]",
        destructive: "bg-destructive/14 text-destructive border-transparent",
        info: "bg-info/14 text-info border-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
