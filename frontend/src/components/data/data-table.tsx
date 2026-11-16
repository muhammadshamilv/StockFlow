import type { ReactNode } from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"

import { Skeleton } from "@/components/feedback/skeleton"
import { cn } from "@/lib/utils"

export type Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** API ordering field – makes the header clickable */
  sortKey?: string
  align?: "left" | "right" | "center"
  className?: string
  /** Hide below this breakpoint */
  hideBelow?: "sm" | "md" | "lg" | "xl"
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  loading?: boolean
  /** Current ordering, e.g. "-created_at" */
  ordering?: string
  onOrderingChange?: (ordering: string) => void
  onRowClick?: (row: T) => void
  empty?: ReactNode
  /** Mobile layout: render each row as a card instead of a table row */
  renderCard?: (row: T) => ReactNode
  skeletonRows?: number
  className?: string
}

const hide = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
}
const align = { left: "text-left", right: "text-right", center: "text-center" }

/** Server-driven table: sorting maps to DRF `?ordering=`, pagination lives outside. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  ordering,
  onOrderingChange,
  onRowClick,
  empty,
  renderCard,
  skeletonRows = 8,
  className,
}: DataTableProps<T>) {
  const isEmpty = !loading && rows?.length === 0

  const toggleSort = (sortKey: string) => {
    if (!onOrderingChange) return
    onOrderingChange(ordering === sortKey ? `-${sortKey}` : ordering === `-${sortKey}` ? "" : sortKey)
  }

  return (
    <div className={className}>
      {/* ---------- Mobile cards ---------- */}
      {renderCard && (
        <div className="space-y-2.5 md:hidden">
          {loading
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            : isEmpty
              ? empty
              : rows?.map((row) =>
                  onRowClick ? (
                    <div
                      key={rowKey(row)}
                      role="button"
                      tabIndex={0}
                      onClick={() => onRowClick(row)}
                      onKeyDown={(e) => e.key === "Enter" && onRowClick(row)}
                      className="bg-card hover:border-primary/40 cursor-pointer rounded-2xl border p-4 transition active:scale-[0.99]"
                    >
                      {renderCard(row)}
                    </div>
                  ) : (
                    <div key={rowKey(row)} className="bg-card rounded-2xl border p-4">
                      {renderCard(row)}
                    </div>
                  ),
                )}
        </div>
      )}

      {/* ---------- Desktop table ---------- */}
      <div className={cn("bg-card overflow-hidden rounded-2xl border", renderCard && "hidden md:block")}>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                {columns.map((col) => {
                  const active = col.sortKey && ordering?.replace("-", "") === col.sortKey
                  const desc = ordering?.startsWith("-")
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (desc ? "descending" : "ascending") : undefined}
                      className={cn(
                        "text-muted-foreground h-11 px-4 text-xs font-medium whitespace-nowrap",
                        align[col.align ?? "left"],
                        col.hideBelow && hide[col.hideBelow],
                        col.className,
                      )}
                    >
                      {col.sortKey && onOrderingChange ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.sortKey!)}
                          className={cn(
                            "hover:text-foreground inline-flex items-center gap-1 rounded transition",
                            active && "text-foreground",
                          )}
                        >
                          {col.header}
                          {active ? (
                            desc ? (
                              <ArrowDownIcon className="size-3.5" />
                            ) : (
                              <ArrowUpIcon className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: skeletonRows }, (_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3.5", col.hideBelow && hide[col.hideBelow])}>
                          <Skeleton
                            className="h-4"
                            style={{ width: `${45 + ((i * 7 + col.key.length * 11) % 45)}%` }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows?.map((row) => (
                    <tr
                      key={rowKey(row)}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "hover:bg-accent/40 border-b transition-colors last:border-0",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3",
                            align[col.align ?? "left"],
                            col.hideBelow && hide[col.hideBelow],
                            col.className,
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {isEmpty && empty}
      </div>
    </div>
  )
}
