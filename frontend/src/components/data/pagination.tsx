import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

type PaginationProps = {
  page: number
  totalPages: number
  count: number
  pageSize: number
  onPageChange: (page: number) => void
  label?: string
}

export function Pagination({
  page,
  totalPages,
  count,
  pageSize,
  onPageChange,
  label = "results",
}: PaginationProps) {
  if (count === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(count, page * pageSize)
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm">
      <p className="text-muted-foreground">
        <span className="text-foreground tabular font-medium">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{" "}
        of <span className="tabular">{formatNumber(count)}</span> {label}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="text-muted-foreground tabular min-w-16 text-center text-xs">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
