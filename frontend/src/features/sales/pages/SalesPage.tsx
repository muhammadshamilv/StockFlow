import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { format, startOfMonth, subDays } from "date-fns"
import {
  DownloadIcon,
  IndianRupeeIcon,
  PlusIcon,
  ReceiptTextIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { DataTable, type Column } from "@/components/data/data-table"
import { Pagination } from "@/components/data/pagination"
import { SearchInput } from "@/components/data/search-input"
import { StatCard } from "@/components/data/stat-card"
import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { PullToRefresh } from "@/components/feedback/pull-to-refresh"
import { PageHeader } from "@/components/shared/page-header"
import { Segmented } from "@/components/shared/segmented"
import { SaleStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { cleanParams, useUrlState } from "@/hooks/use-url-state"
import { downloadFile } from "@/lib/download"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"

import { PAYMENT_METHODS, type SaleListItem } from "../api"
import { useSales, useSalesSummary } from "../hooks"

const DEFAULTS = { search: "", period: "30d", status: "", payment: "", ordering: "-created_at", page: "1" }
const PAGE_SIZE = 20
const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]

function periodRange(period: string) {
  const today = new Date()
  const iso = (d: Date) => format(d, "yyyy-MM-dd")
  switch (period) {
    case "today":
      return { date_from: iso(today), date_to: iso(today) }
    case "7d":
      return { date_from: iso(subDays(today, 6)), date_to: iso(today) }
    case "30d":
      return { date_from: iso(subDays(today, 29)), date_to: iso(today) }
    case "month":
      return { date_from: iso(startOfMonth(today)), date_to: iso(today) }
    default:
      return { date_from: "", date_to: "" }
  }
}

export default function SalesPage() {
  useDocumentTitle("Sales")
  const navigate = useNavigate()
  const client = useQueryClient()
  const { isManager } = useSession()
  const [state, update] = useUrlState(DEFAULTS)
  const [exporting, setExporting] = useState(false)

  const filters = cleanParams({
    ...periodRange(state.period),
    status: state.status,
    payment_method: state.payment,
    search: state.search,
  })
  const sales = useSales({
    ...filters,
    page: Number(state.page),
    page_size: PAGE_SIZE,
    ordering: state.ordering,
  })
  const summary = useSalesSummary(filters)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const range = periodRange(state.period)
      await downloadFile("/analytics/reports/sales/", cleanParams(range), "sales-report.csv")
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<SaleListItem>[] = [
    {
      key: "invoice",
      header: "Invoice",
      sortKey: "invoice_number",
      cell: (s) => <span className="font-mono text-[13px] font-medium">{s.invoice_number}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      cell: (s) => <span className="font-medium">{s.customer_name}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortKey: "created_at",
      hideBelow: "lg",
      cell: (s) => <span className="text-muted-foreground">{formatDateTime(s.created_at)}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      hideBelow: "xl",
      cell: (s) => <span className="tabular">{s.items_count}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      hideBelow: "lg",
      cell: (s) => <span className="text-muted-foreground">{s.payment_method_display}</span>,
    },
    { key: "status", header: "Status", hideBelow: "sm", cell: (s) => <SaleStatusBadge status={s.status} /> },
    {
      key: "total",
      header: "Total",
      sortKey: "total",
      align: "right",
      cell: (s) => (
        <span
          className={
            s.status === "CANCELLED" ? "text-muted-foreground tabular line-through" : "tabular font-semibold"
          }
        >
          {formatCurrency(s.total)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales"
        description="Every invoice, searchable by number, customer or product."
        actions={
          <>
            {isManager && (
              <Button variant="outline" onClick={exportCsv} loading={exporting} loadingText="Exporting…">
                <DownloadIcon /> Export report
              </Button>
            )}
            <Button asChild variant="gradient">
              <Link to="/sales/new">
                <PlusIcon /> New sale
              </Link>
            </Button>
          </>
        }
      />

      <Segmented
        value={state.period}
        onChange={(period) => update({ period })}
        options={PERIODS}
        aria-label="Period"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          loading={summary.isPending}
          label="Revenue"
          icon={IndianRupeeIcon}
          value={summary.data && formatCurrency(summary.data.revenue)}
        />
        <StatCard
          loading={summary.isPending}
          label="Orders"
          icon={ReceiptTextIcon}
          value={summary.data && formatNumber(summary.data.orders)}
        />
        <StatCard
          loading={summary.isPending}
          label="Avg. order"
          icon={WalletIcon}
          value={summary.data && formatCurrency(summary.data.average_order_value)}
        />
        <StatCard
          loading={summary.isPending}
          label="Cancelled"
          icon={XCircleIcon}
          value={summary.data && formatNumber(summary.data.cancelled)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={state.search}
          onChange={(search) => update({ search })}
          placeholder="Invoice, customer, product…"
          loading={sales.isFetching}
        />
        <Select value={state.status || "any"} onValueChange={(v) => update({ status: v === "any" ? "" : v })}>
          <SelectTrigger className="sm:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={state.payment || "any"}
          onValueChange={(v) => update({ payment: v === "any" ? "" : v })}
        >
          <SelectTrigger className="sm:w-40" aria-label="Payment method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any payment</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sales.isError ? (
        <ErrorState error={sales.error} onRetry={sales.refetch} className="bg-card rounded-2xl border" />
      ) : (
        <PullToRefresh onRefresh={() => client.invalidateQueries({ queryKey: queryKeys.sales.all })}>
          <DataTable
            columns={columns}
            rows={sales.data?.results}
            rowKey={(s) => s.id}
            loading={sales.isPending}
            ordering={state.ordering}
            onOrderingChange={(ordering) => update({ ordering: ordering || "-created_at" })}
            onRowClick={(s) => navigate(`/sales/${s.id}`)}
            empty={
              <EmptyState
                icon={ReceiptTextIcon}
                title="No sales found"
                description="Try a different period or search."
              />
            }
            renderCard={(s) => (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.customer_name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    <span className="font-mono">{s.invoice_number}</span> · {formatDateTime(s.created_at)}
                  </p>
                  <div className="mt-2">
                    <SaleStatusBadge status={s.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="tabular font-semibold">{formatCurrency(s.total)}</p>
                  <p className="text-muted-foreground text-xs">{s.payment_method_display}</p>
                </div>
              </div>
            )}
          />
          {sales.data && (
            <Pagination
              page={sales.data.page}
              totalPages={sales.data.total_pages}
              count={sales.data.count}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => update({ page: String(page) }, { resetPage: false })}
              label="sales"
            />
          )}
        </PullToRefresh>
      )}
    </div>
  )
}
