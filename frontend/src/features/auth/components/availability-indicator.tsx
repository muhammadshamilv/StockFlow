import { AlertCircleIcon, CheckIcon, XIcon } from "lucide-react"

import { PulseDots } from "@/components/feedback/pulse-dots"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { AvailabilityStatus } from "../hooks"

/** Icon shown inside the username/email field while checking availability. */
export function AvailabilityIndicator({ status, message }: { status: AvailabilityStatus; message?: string }) {
  if (status === "idle") return null
  if (status === "checking")
    return (
      <span className="grid w-8 place-items-center">
        <PulseDots size="sm" label="Checking availability" />
      </span>
    )

  const config = {
    available: { icon: CheckIcon, cls: "bg-success/15 text-success" },
    taken: { icon: XIcon, cls: "bg-destructive/15 text-destructive" },
    error: { icon: AlertCircleIcon, cls: "bg-warning/15 text-warning" },
  }[status]
  const Icon = config.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`mr-1 grid size-6 place-items-center rounded-full ${config.cls}`}
          aria-label={message}
        >
          <Icon className="size-3.5" strokeWidth={3} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{message ?? "Couldn't check right now"}</TooltipContent>
    </Tooltip>
  )
}
