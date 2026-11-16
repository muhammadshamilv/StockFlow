import { AlertTriangleIcon, RefreshCwIcon, WifiOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { normalizeError } from "@/lib/errors"
import { cn } from "@/lib/utils"

type ErrorStateProps = {
  error?: unknown
  title?: string
  onRetry?: () => unknown
  retrying?: boolean
  className?: string
}

export function ErrorState({ error, title, onRetry, retrying, className }: ErrorStateProps) {
  const apiError = error ? normalizeError(error) : null
  const Icon = apiError?.isNetwork ? WifiOffIcon : AlertTriangleIcon
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="border-destructive/25 bg-destructive/10 text-destructive mb-5 grid size-14 place-items-center rounded-2xl border">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold">
        {title ?? (apiError?.isNetwork ? "You're offline" : "Something went wrong")}
      </h3>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
        {apiError?.message ?? "Please try again."}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => onRetry()}
          loading={retrying}
          loadingText="Retrying…"
        >
          <RefreshCwIcon /> Try again
        </Button>
      )}
    </div>
  )
}
