import type { ReactNode } from "react"
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const tones = {
  error: { icon: AlertCircleIcon, cls: "border-destructive/30 bg-destructive/10 text-destructive" },
  success: { icon: CheckCircle2Icon, cls: "border-success/30 bg-success/10 text-success" },
  warning: {
    icon: TriangleAlertIcon,
    cls: "border-warning/35 bg-warning/10 text-[oklch(0.5_0.12_70)] dark:text-warning",
  },
  info: { icon: InfoIcon, cls: "border-info/30 bg-info/10 text-info" },
}

type AlertBannerProps = {
  tone?: keyof typeof tones
  title?: ReactNode
  children?: ReactNode
  className?: string
}

export function AlertBanner({ tone = "info", title, children, className }: AlertBannerProps) {
  const { icon: Icon, cls } = tones[tone]
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border px-3.5 py-3 text-sm", cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-foreground/75">{children}</div>}
      </div>
    </div>
  )
}
