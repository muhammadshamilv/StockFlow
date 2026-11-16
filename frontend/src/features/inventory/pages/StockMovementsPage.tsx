import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowDownLeftIcon } from "lucide-react"

import { SearchInput } from "@/components/data/search-input"
import { ErrorState } from "@/components/feedback/error-state"
import { PullToRefresh } from "@/components/feedback/pull-to-refresh"
import { PageHeader } from "@/components/shared/page-header"
import { Segmented } from "@/components/shared/segmented"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { cleanParams, useUrlState } from "@/hooks/use-url-state"
import { queryKeys } from "@/lib/query-keys"

import { MovementFormDialog } from "../components/movement-form-dialog"
import { MovementList } from "../components/movement-list"
import { useMovementsFeed } from "../hooks"

const DEFAULTS = { type: "all", search: "" }
const TYPES = [
  { value: "all", label: "All" },
  { value: "IN", label: "Stock in" },
  { value: "SALE", label: "Sales" },
  { value: "OUT", label: "Stock out" },
  { value: "ADJUSTMENT", label: "Adjustments" },
  { value: "RETURN", label: "Returns" },
]

export default function StockMovementsPage() {
  useDocumentTitle("Stock movements")
  const client = useQueryClient()
  const [state, update] = useUrlState(DEFAULTS)
  const [open, setOpen] = useState(false)
  const feed = useMovementsFeed(
    cleanParams({ search: state.search, movement_type: state.type === "all" ? "" : state.type }),
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock movements"
        description="The permanent ledger of every unit in and out. Entries can't be edited or deleted."
        actions={
          <Button onClick={() => setOpen(true)}>
            <ArrowDownLeftIcon /> Record movement
          </Button>
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={state.type}
          onChange={(type) => update({ type })}
          options={TYPES}
          aria-label="Movement type"
        />
        <SearchInput
          value={state.search}
          onChange={(search) => update({ search })}
          placeholder="Product, SKU or reference…"
          loading={feed.isFetching && !feed.isFetchingNextPage}
        />
      </div>

      {feed.isError ? (
        <ErrorState error={feed.error} onRetry={feed.refetch} className="bg-card rounded-2xl border" />
      ) : (
        <PullToRefresh onRefresh={() => client.invalidateQueries({ queryKey: queryKeys.movements.all })}>
          <div className="bg-card overflow-hidden rounded-2xl border">
            <MovementList
              items={feed.data?.pages.flatMap((page) => page.results) ?? []}
              loading={feed.isPending}
              hasMore={Boolean(feed.hasNextPage)}
              loadingMore={feed.isFetchingNextPage}
              onLoadMore={feed.fetchNextPage}
            />
          </div>
        </PullToRefresh>
      )}
      <MovementFormDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
