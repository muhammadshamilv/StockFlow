import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowDownLeftIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PackageSearchIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { DataTable, type Column } from "@/components/data/data-table"
import { Pagination } from "@/components/data/pagination"
import { SearchInput } from "@/components/data/search-input"
import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { PullToRefresh } from "@/components/feedback/pull-to-refresh"
import { PageHeader } from "@/components/shared/page-header"
import { Segmented } from "@/components/shared/segmented"
import { StockStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "@/features/auth/session-provider"
import { MovementFormDialog } from "@/features/inventory/components/movement-form-dialog"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { cleanParams, useUrlState } from "@/hooks/use-url-state"
import { downloadFile } from "@/lib/download"
import { formatCurrency, formatNumber } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"

import type { Product, ProductOption } from "../api"
import { AdjustStockDialog } from "../components/adjust-stock-dialog"
import { ProductFormDialog } from "../components/product-form-dialog"
import { useCategoryOptions, useProducts, useProductSummary, useSaveProduct } from "../hooks"

const DEFAULTS = { search: "", status: "all", category: "", ordering: "name", page: "1", new: "" }
const PAGE_SIZE = 20

type StatusTab = "all" | "in_stock" | "low_stock" | "out_of_stock" | "archived"

const toOption = (p: Product): ProductOption => ({
  id: p.id,
  sku: p.sku,
  barcode: p.barcode,
  name: p.name,
  category: p.category,
  category_name: p.category_name,
  selling_price: p.selling_price,
  quantity: p.quantity,
  unit: p.unit,
  stock_status: p.stock_status,
})

export default function ProductsPage() {
  useDocumentTitle("Products")
  const navigate = useNavigate()
  const client = useQueryClient()
  const { isManager } = useSession()
  const [state, update] = useUrlState(DEFAULTS)
  const status = state.status as StatusTab

  const params = cleanParams({
    page: Number(state.page),
    page_size: PAGE_SIZE,
    search: state.search,
    category: state.category,
    ordering: state.ordering,
    is_active: status === "archived" ? "false" : "true",
    stock_status: status === "all" || status === "archived" ? "" : status,
  })
  const products = useProducts(params)
  const summary = useProductSummary()
  const { data: categories = [] } = useCategoryOptions()
  const save = useSaveProduct()

  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [moving, setMoving] = useState<{ open: boolean; product: ProductOption | null }>({
    open: false,
    product: null,
  })
  const [exporting, setExporting] = useState(false)

  const createOpen = formOpen || state.new === "1"
  const openForm = (product: Product | null) => {
    setEditing(product)
    setFormOpen(true)
  }
  const closeForm = (open: boolean) => {
    if (open) return
    setFormOpen(false)
    setEditing(null)
    if (state.new) update({ new: "" }, { resetPage: false })
  }

  const toggleArchive = async (product: Product) => {
    await save.mutateAsync({ id: product.id, input: { is_active: !product.is_active } })
    toast.success(product.is_active ? `${product.name} archived` : `${product.name} restored`)
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadFile(
        "/products/export/",
        { ...params, page: undefined, page_size: undefined },
        "products.csv",
      )
    } finally {
      setExporting(false)
    }
  }

  const s = summary.data
  const tabs: { value: StatusTab; label: string; count?: number }[] = [
    { value: "all", label: "All", count: s?.total },
    { value: "in_stock", label: "In stock", count: s?.in_stock },
    { value: "low_stock", label: "Low", count: s?.low_stock },
    { value: "out_of_stock", label: "Out", count: s?.out_of_stock },
    { value: "archived", label: "Archived", count: s?.archived },
  ]

  const actions = (p: Product) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() => setMoving({ open: true, product: toOption(p) })}
          disabled={!p.is_active}
        >
          <ArrowDownLeftIcon /> Receive / remove stock
        </DropdownMenuItem>
        {isManager && (
          <>
            <DropdownMenuItem onSelect={() => setAdjusting(p)} disabled={!p.is_active}>
              <ScaleIcon /> Adjust stock count
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openForm(p)}>
              <PencilIcon /> Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => toggleArchive(p)}>
              {p.is_active ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
              {p.is_active ? "Archive" : "Restore"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortKey: "name",
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.name}</p>
          <p className="text-muted-foreground font-mono text-xs">{p.sku}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "lg",
      cell: (p) => (
        <span className="text-muted-foreground inline-flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.category_color }} />
          {p.category_name}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortKey: "selling_price",
      align: "right",
      cell: (p) => <span className="tabular font-medium">{formatCurrency(p.selling_price)}</span>,
    },
    ...(isManager
      ? [
          {
            key: "margin",
            header: "Margin",
            align: "right" as const,
            hideBelow: "xl" as const,
            cell: (p: Product) => (
              <span className="text-muted-foreground tabular">{p.margin_percent ?? "—"}%</span>
            ),
          },
        ]
      : []),
    {
      key: "stock",
      header: "Stock",
      sortKey: "quantity",
      align: "right",
      cell: (p) => (
        <span className="tabular">
          <span className="font-medium">{formatNumber(p.quantity)}</span>{" "}
          <span className="text-muted-foreground text-xs">{p.unit}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideBelow: "sm",
      cell: (p) => <StockStatusBadge status={p.stock_status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      className: "w-12",
      cell: actions,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Your catalogue with live stock levels. Click a product for its full history."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} loading={exporting} loadingText="Exporting…">
              <DownloadIcon /> Export
            </Button>
            <Button variant="outline" onClick={() => setMoving({ open: true, product: null })}>
              <ArrowDownLeftIcon /> Stock in/out
            </Button>
            {isManager && (
              <Button onClick={() => openForm(null)}>
                <PlusIcon /> Add product
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={status}
          onChange={(v) => update({ status: v })}
          options={tabs}
          aria-label="Stock status"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={state.search}
            onChange={(search) => update({ search })}
            placeholder="Search name, SKU, barcode…"
            loading={products.isFetching}
          />
          <Select
            value={state.category || "all"}
            onValueChange={(v) => update({ category: v === "all" ? "" : v })}
          >
            <SelectTrigger className="sm:w-48" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.isError ? (
        <ErrorState
          error={products.error}
          onRetry={products.refetch}
          className="bg-card rounded-2xl border"
        />
      ) : (
        <PullToRefresh onRefresh={() => client.invalidateQueries({ queryKey: queryKeys.products.all })}>
          <DataTable
            columns={columns}
            rows={products.data?.results}
            rowKey={(p) => p.id}
            loading={products.isPending}
            ordering={state.ordering}
            onOrderingChange={(ordering) => update({ ordering: ordering || "name" })}
            onRowClick={(p) => navigate(`/products/${p.id}`)}
            empty={
              <EmptyState
                icon={PackageSearchIcon}
                title={state.search || state.category ? "No matching products" : "No products here yet"}
                description={
                  state.search ? `Nothing matches “${state.search}”. Try another search.` : undefined
                }
                action={
                  isManager && !state.search ? (
                    <Button size="sm" onClick={() => openForm(null)}>
                      <PlusIcon /> Add product
                    </Button>
                  ) : undefined
                }
              />
            }
            renderCard={(p) => (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    <span className="font-mono">{p.sku}</span> · {p.category_name}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <StockStatusBadge status={p.stock_status} />
                    <span className="text-muted-foreground tabular text-xs">
                      {p.quantity} {p.unit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="tabular font-semibold">{formatCurrency(p.selling_price)}</span>
                  {actions(p)}
                </div>
              </div>
            )}
          />
          {products.data && (
            <Pagination
              page={products.data.page}
              totalPages={products.data.total_pages}
              count={products.data.count}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => update({ page: String(page) }, { resetPage: false })}
              label="products"
            />
          )}
        </PullToRefresh>
      )}

      <ProductFormDialog open={createOpen} onOpenChange={closeForm} product={editing} />
      <AdjustStockDialog product={adjusting} onOpenChange={(open) => !open && setAdjusting(null)} />
      <MovementFormDialog
        open={moving.open}
        product={moving.product}
        onOpenChange={(open) => setMoving((m) => ({ ...m, open }))}
      />
    </div>
  )
}
