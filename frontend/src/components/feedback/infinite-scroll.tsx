import { useEffect } from "react"
import { CheckCircle2Icon } from "lucide-react"
import { useInView } from "react-intersection-observer"

import { cn } from "@/lib/utils"

import { Spinner } from "./spinner"

type InfiniteScrollProps = {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => unknown
  /** Text when everything is loaded. Set to null to hide. */
  endMessage?: string | null
  rootMargin?: string
  className?: string
}

/**
 * Drop at the end of a list. When it scrolls into view it calls `onLoadMore`
 * (wire it to TanStack Query's fetchNextPage).
 */
export function InfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  endMessage = "You're all caught up",
  rootMargin = "240px",
  className,
}: InfiniteScrollProps) {
  const { ref, inView } = useInView({ rootMargin })

  useEffect(() => {
    if (inView && hasMore && !loading) onLoadMore()
  }, [inView, hasMore, loading, onLoadMore])

  return (
    <div ref={ref} className={cn("text-muted-foreground flex justify-center py-5 text-sm", className)}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner size="sm" className="text-primary" /> Loading more…
        </span>
      ) : !hasMore && endMessage ? (
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2Icon className="text-success size-4" /> {endMessage}
        </span>
      ) : null}
    </div>
  )
}
