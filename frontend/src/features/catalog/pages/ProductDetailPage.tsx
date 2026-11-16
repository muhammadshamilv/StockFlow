import { useState } from "react"
import {
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  BarcodeIcon,
  BoxIcon,
  CalendarIcon,
  FolderIcon,
  IndianRupeeIcon,
  PencilIcon,
  ScaleIcon,
  TrendingUpIcon,
  WarehouseIcon,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { StatCard } from "@/components/data/stat-card"
import { ErrorState } from "@/components/feedback/error-state"
import { Skeleton } from "@/components/feedback/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { StockStatusBadge } from "@/components/shared/status-badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "@/features/auth/session-provider"
import { MovementFormDialog } from "@/features/inventory/components/movement-form-dialog"
import { MovementList } from "@/features/inventory/components/movement-list"
import { useMovementsFeed } from "@/features/inventory/hooks"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency, formatDay, formatNumber } from "@/lib/format"

import { AdjustStockDialog } from "../components/adjust-stock-dialog"
import { ProductFormDialog } from "../components/product-form-dialog"
import { useProduct } from "../hooks"

export default function ProductDetailPage() {
  const id = Number(useParams().id)
  const { isManager } = useSession()
  const product = useProduct(id)
  const movements = useMovementsFeed({ product: id })
  const [editOpen, setEditOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  useDocumentTitle(product.data?.name ?? "Product")

  if (product.isError) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/products">
            <ArrowLeftIcon /> Products
          </Link>
        </Button>
        <ErrorState error={product.error} onRetry={product.refetch} className="bg-card rounded-2xl border" />
      </div>
    )
  }

  const p = product.data
  const fill = p ? Math.min(100, (p.quantity / Math.max(1, p.reorder_level * 3)) * 100) : 0

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/products">
          <ArrowLeftIcon /> Products
        </Link>
      </Button>

      {!p ? (
        <Skeleton className="h-16 w-2/3 rounded-xl" />
      ) : (
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2 normal-case">
              <span className="size-2 rounded-full" style={{ background: p.category_color }} />
              {p.category_name}
            </span>
          }
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              {p.name}
              {!p.is_active && <Badge variant="secondary">Archived</Badge>}
            </span>
          }
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-mono">{p.sku}</span>
              <StockStatusBadge status={p.stock_status} />
            </span>
          }
          actions={
            p.is_active && (
              <>
                <Button variant="outline" onClick={() => setMoveOpen(true)}>
                  <ArrowDownLeftIcon /> Stock in/out
                </Button>
                {isManager && (
                  <>
                    <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                      <ScaleIcon /> Adjust
                    </Button>
                    <Button onClick={() => setEditOpen(true)}>
                      <PencilIcon /> Edit
                    </Button>
                  </>
                )}
              </>
            )
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={!p}
          label="In stock"
          icon={WarehouseIcon}
          value={p && `${formatNumber(p.quantity)} ${p.unit}`}
          hint={p && `Reorder at ${p.reorder_level}`}
        />
        <StatCard
          loading={!p}
          label="Selling price"
          icon={IndianRupeeIcon}
          value={p && formatCurrency(p.selling_price)}
          hint={p && `per ${p.unit}`}
        />
        {isManager && (
          <>
            <StatCard
              loading={!p}
              label="Margin"
              icon={TrendingUpIcon}
              value={p && `${p.margin_percent ?? "—"}%`}
              hint={p && `Avg. cost ${formatCurrency(p.cost_price)}`}
            />
            <StatCard
              loading={!p}
              label="Stock value"
              icon={BoxIcon}
              value={p && formatCurrency(p.stock_value)}
              hint="at cost"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Stock history</CardTitle>
          </CardHeader>
          <div className="mt-4 border-t">
            <MovementList
              items={movements.data?.pages.flatMap((page) => page.results) ?? []}
              loading={movements.isPending}
              hasMore={Boolean(movements.hasNextPage)}
              loadingMore={movements.isFetchingNextPage}
              onLoadMore={movements.fetchNextPage}
              showProduct={false}
            />
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!p ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div>
                  <div className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                    <span>Stock level</span>
                    <span className="tabular">
                      {p.quantity} / {p.reorder_level * 3} target
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, fill)}%`,
                        background:
                          p.stock_status === "in_stock"
                            ? "var(--status-good)"
                            : p.stock_status === "low_stock"
                              ? "var(--status-warning)"
                              : "var(--status-critical)",
                      }}
                    />
                  </div>
                </div>
                {[
                  [FolderIcon, "Category", p.category_name],
                  [BoxIcon, "Unit", p.unit_display],
                  [BarcodeIcon, "Barcode", p.barcode || "—"],
                  [CalendarIcon, "Added", formatDay(p.created_at)],
                ].map(([Icon, label, value]) => {
                  const I = Icon as typeof FolderIcon
                  return (
                    <div key={label as string} className="flex items-center gap-3">
                      <I className="text-muted-foreground size-4" />
                      <span className="text-muted-foreground">{label as string}</span>
                      <span className="ml-auto text-right font-medium">{value as string}</span>
                    </div>
                  )
                })}
                {p.description && <p className="text-muted-foreground border-t pt-4">{p.description}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {p && (
        <>
          <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={p} />
          <AdjustStockDialog product={adjustOpen ? p : null} onOpenChange={setAdjustOpen} />
          <MovementFormDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            product={{
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
            }}
          />
        </>
      )}
    </div>
  )
}
