import { cn } from "@/lib/utils"

/** Shimmering placeholder block. Compose these to mirror the real layout. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("shimmer rounded-md", className)} {...props} />
}

/** Avatar + two lines + paragraph (the "card" skeleton from the reference). */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card space-y-4 rounded-2xl border p-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[85%]" />
        <Skeleton className="h-3 w-[92%]" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

/** KPI tile placeholder */
function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card space-y-4 rounded-2xl border p-5", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/** Table / list rows placeholder */
function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${55 + ((i * 13) % 30)}%` }} />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonRows, SkeletonStat }
