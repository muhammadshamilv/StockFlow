import { useState } from "react"
import { ArrowLeftIcon, FileTextIcon, UserIcon, XCircleIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { ErrorState } from "@/components/feedback/error-state"
import { Skeleton } from "@/components/feedback/skeleton"
import { AlertBanner } from "@/components/shared/alert-banner"
import { PageHeader } from "@/components/shared/page-header"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { SaleStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { openPdf } from "@/lib/download"
import { formatCurrency, formatDateTime } from "@/lib/format"

import { useCancelSale, useSale } from "../hooks"

export default function SaleDetailPage() {
  const id = Number(useParams().id)
  const { isManager } = useSession()
  const sale = useSale(id)
  const cancel = useCancelSale()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [opening, setOpening] = useState(false)
  useDocumentTitle(sale.data?.invoice_number ?? "Sale")
  const s = sale.data

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/sales">
        <ArrowLeftIcon /> Sales
      </Link>
    </Button>
  )

  if (sale.isError)
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={sale.error} onRetry={sale.refetch} className="bg-card rounded-2xl border" />
      </div>
    )

  return (
    <div className="space-y-6">
      {back}
      {!s ? (
        <Skeleton className="h-16 w-1/2 rounded-xl" />
      ) : (
        <PageHeader
          eyebrow={formatDateTime(s.created_at)}
          title={<span className="font-mono">{s.invoice_number}</span>}
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              <SaleStatusBadge status={s.status} /> {s.payment_method_display}
              {s.created_by_name && ` · served by ${s.created_by_name}`}
            </span>
          }
          actions={
            <>
              <Button
                variant="outline"
                loading={opening}
                loadingText="Opening…"
                onClick={async () => {
                  setOpening(true)
                  try {
                    await openPdf(`/sales/${s.id}/invoice/`)
                  } finally {
                    setOpening(false)
                  }
                }}
              >
                <FileTextIcon /> Invoice PDF
              </Button>
              {isManager && s.status === "COMPLETED" && (
                <Button variant="destructive-soft" onClick={() => setCancelOpen(true)}>
                  <XCircleIcon /> Cancel sale
                </Button>
              )}
            </>
          }
        />
      )}

      {s?.status === "CANCELLED" && (
        <AlertBanner tone="error" title={`Cancelled ${s.cancelled_at ? formatDateTime(s.cancelled_at) : ""}`}>
          {s.cancel_reason} {s.cancelled_by_name && `– by ${s.cancelled_by_name}`}. Stock was returned to
          inventory.
        </AlertBanner>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {!s ? (
              <Skeleton className="mx-6 mb-6 h-40" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-y text-xs">
                    <th className="px-5 py-2.5 text-left font-medium sm:px-6">Product</th>
                    <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                    <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Rate</th>
                    <th className="px-5 py-2.5 text-right font-medium sm:px-6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {s.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 sm:px-6">
                        <Link to={`/products/${item.product}`} className="hover:text-primary font-medium">
                          {item.product_name}
                        </Link>
                        <p className="text-muted-foreground font-mono text-xs">{item.sku}</p>
                      </td>
                      <td className="tabular px-3 py-3 text-right">{item.quantity}</td>
                      <td className="text-muted-foreground tabular hidden px-3 py-3 text-right sm:table-cell">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="tabular px-5 py-3 text-right font-medium sm:px-6">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {!s ? (
                <Skeleton className="h-32" />
              ) : (
                <dl className="space-y-2 text-sm">
                  {[
                    ["Subtotal", formatCurrency(s.subtotal)],
                    ...(Number(s.discount_amount)
                      ? [["Discount", `− ${formatCurrency(s.discount_amount)}`]]
                      : []),
                    [`GST (${Number(s.tax_rate)}%)`, formatCurrency(s.tax_amount)],
                  ].map(([label, value]) => (
                    <div key={label} className="text-muted-foreground flex justify-between">
                      <dt>{label}</dt>
                      <dd className="tabular">{value}</dd>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between border-t pt-2.5">
                    <dt className="font-semibold">Total</dt>
                    <dd className="tabular text-xl font-semibold">{formatCurrency(s.total)}</dd>
                  </div>
                  {s.amount_paid && (
                    <div className="text-muted-foreground flex justify-between">
                      <dt>Paid · change</dt>
                      <dd className="tabular">
                        {formatCurrency(s.amount_paid)} · {formatCurrency(s.change_due ?? 0)}
                      </dd>
                    </div>
                  )}
                  {s.gross_profit !== null && (
                    <div className="flex justify-between border-t pt-2.5">
                      <dt className="text-muted-foreground">Gross profit</dt>
                      <dd className="text-success tabular font-medium">{formatCurrency(s.gross_profit)}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="text-muted-foreground size-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {s?.customer_detail ? (
                <div className="space-y-0.5">
                  <p className="font-medium">{s.customer_detail.name}</p>
                  {s.customer_detail.phone && (
                    <p className="text-muted-foreground">{s.customer_detail.phone}</p>
                  )}
                  {s.customer_detail.email && (
                    <p className="text-muted-foreground">{s.customer_detail.email}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Walk-in customer</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ResponsiveDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this sale?"
        description="Items go back into stock and the invoice is marked cancelled. This can't be undone."
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            await cancel.mutateAsync({ id, reason })
            setCancelOpen(false)
            setReason("")
          }}
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required) – e.g. customer returned items"
            rows={3}
            autoFocus
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Keep sale
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reason.trim().length < 3}
              loading={cancel.isPending}
              loadingText="Cancelling…"
            >
              Cancel sale
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  )
}
