import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { PackageSearchIcon, PlusIcon, ScanBarcodeIcon } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Skeleton } from "@/components/feedback/skeleton"
import { Spinner } from "@/components/feedback/spinner"
import { Segmented } from "@/components/shared/segmented"
import { Input } from "@/components/ui/input"
import { catalogApi, type ProductOption } from "@/features/catalog/api"
import { useCategoryOptions } from "@/features/catalog/hooks"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { formatCurrency } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

type Props = { onAdd: (product: ProductOption) => void; inCart: (id: number) => number }

/** Searchable product tiles. Press Enter on an exact SKU/barcode to add it instantly (scanner-friendly). */
export function PosProductGrid({ onAdd, inCart }: Props) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const term = useDebouncedValue(search.trim(), 200)
  const { data: categories = [] } = useCategoryOptions()
  const products = useQuery({
    queryKey: queryKeys.products.search(term, { category, pos: true }),
    queryFn: () =>
      catalogApi.productOptions({ search: term, category: category === "all" ? undefined : category }),
    placeholderData: keepPreviousData,
  })

  const addExactMatch = () => {
    const code = search.trim().toLowerCase()
    const match = products.data?.find(
      (p) => p.sku.toLowerCase() === code || (p.barcode && p.barcode === code),
    )
    const target = match ?? (products.data?.length === 1 ? products.data[0] : undefined)
    if (target && target.quantity > inCart(target.id)) {
      onAdd(target)
      setSearch("")
    }
  }

  return (
    // min-w-0: let the category chip row scroll instead of widening the grid column
    <div className="min-w-0 space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExactMatch())}
        placeholder="Search or scan barcode, press Enter to add"
        startAdornment={<ScanBarcodeIcon />}
        endAdornment={products.isFetching ? <Spinner size="xs" className="text-primary mr-2.5" /> : null}
        className="h-12 text-base"
        autoFocus
        aria-label="Search products"
      />
      <Segmented
        size="sm"
        value={category}
        onChange={setCategory}
        options={[
          { value: "all", label: "All" },
          ...categories.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
        className="w-full"
        aria-label="Category"
      />

      {products.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !products.data?.length ? (
        <EmptyState
          icon={PackageSearchIcon}
          title="No products found"
          description="Try another name, SKU or barcode."
          className="bg-card rounded-2xl border"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {products.data.map((p) => {
            const qty = inCart(p.id)
            const left = p.quantity - qty
            const disabled = left <= 0
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(p)}
                className={cn(
                  "group bg-card hover:border-primary/50 relative flex min-h-28 flex-col rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
                  qty > 0 && "border-primary/60 bg-primary/[0.04]",
                )}
              >
                {qty > 0 && (
                  <span className="bg-primary text-primary-foreground tabular absolute -top-2 -right-2 grid size-6 place-items-center rounded-full text-xs font-semibold shadow-lg">
                    {qty}
                  </span>
                )}
                <span className="line-clamp-2 text-sm leading-snug font-medium">{p.name}</span>
                <span className="text-muted-foreground mt-0.5 truncate text-[11px]">{p.category_name}</span>
                <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <span className="tabular font-semibold">{formatCurrency(p.selling_price)}</span>
                  <span
                    className={cn(
                      "tabular text-[11px]",
                      left <= 3 ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {disabled ? "Out" : `${left} left`}
                  </span>
                </span>
                <PlusIcon className="text-primary absolute top-3 right-3 size-4 opacity-0 transition group-hover:opacity-100" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
