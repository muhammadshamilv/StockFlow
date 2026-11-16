import { HistoryIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/feedback/empty-state"
import { InfiniteScroll } from "@/components/feedback/infinite-scroll"
import { SkeletonRows } from "@/components/feedback/skeleton"
import { MovementTypeBadge } from "@/components/shared/status-badges"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { Movement } from "../api"

type Props = {
  items: Movement[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => unknown
  /** Hide the product name (when shown on the product page) */
  showProduct?: boolean
}

/** Ledger rows: type, signed quantity, before → after, who & when. */
export function MovementList({
  items,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  showProduct = true,
}: Props) {
  if (loading) return <SkeletonRows rows={6} className="px-5" />
  if (!items.length)
    return (
      <EmptyState
        icon={HistoryIcon}
        title="No movements yet"
        description="Stock received, sold and adjusted shows up here."
      />
    )

  return (
    <div>
      <ul className="divide-y">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div
              className={cn(
                "tabular grid size-10 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold",
                m.signed_quantity >= 0 ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {m.signed_quantity > 0 ? "+" : ""}
              {m.signed_quantity}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {showProduct ? (
                  <Link to={`/products/${m.product}`} className="hover:text-primary truncate font-medium">
                    {m.product_name}
                  </Link>
                ) : (
                  <span className="font-medium">{m.movement_type_display}</span>
                )}
                {showProduct && <MovementTypeBadge type={m.movement_type} />}
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {formatDateTime(m.created_at)}
                {m.created_by_name && ` · ${m.created_by_name}`}
                {m.reference && (
                  <>
                    {" · "}
                    <span className="font-mono">{m.reference}</span>
                  </>
                )}
                {m.note && !m.note.startsWith("Sale ") && ` · ${m.note}`}
              </p>
            </div>
            <div className="text-muted-foreground hidden text-right text-xs sm:block">
              <span className="tabular">{m.quantity_before}</span> →{" "}
              <span className="text-foreground tabular font-medium">{m.quantity_after}</span>
              <p>in stock</p>
            </div>
          </li>
        ))}
      </ul>
      <InfiniteScroll hasMore={hasMore} loading={loadingMore} onLoadMore={onLoadMore} />
    </div>
  )
}
