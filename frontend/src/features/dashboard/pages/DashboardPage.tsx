import { useAtom } from "jotai"
import {
  ArrowRightIcon,
  BoxesIcon,
  IndianRupeeIcon,
  PackageIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { StatCard } from "@/components/data/stat-card"
import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { Skeleton } from "@/components/feedback/skeleton"
import { Spinner } from "@/components/feedback/spinner"
import { PageHeader } from "@/components/shared/page-header"
import { Segmented } from "@/components/shared/segmented"
import { SaleStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency, formatNumber, timeAgo } from "@/lib/format"
import { dashboardRangeAtom, type DashboardRange } from "@/store/preferences.atoms"

import { BarList } from "../components/bar-list"
import { RevenueChart } from "../components/revenue-chart"
import { StockHealth } from "../components/stock-health"
import { useDashboard } from "../hooks"

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "12m", label: "12M" },
]
const RANGE_TEXT: Record<DashboardRange, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "12m": "last 12 months",
}

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

export default function DashboardPage() {
  useDocumentTitle("Dashboard")
  const { user, isManager } = useSession()
  const [range, setRange] = useAtom(dashboardRangeAtom)
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useDashboard(range)

  const kpis = data?.kpis
  const vs = `vs previous ${RANGE_TEXT[range].replace("last ", "")}`

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        title={
          <>
            {greeting()}, <span className="text-gradient">{user?.first_name || user?.username}</span>
          </>
        }
        description={`Here's how your store performed over the ${RANGE_TEXT[range]}.`}
        actions={
          <>
            {isFetching && isPlaceholderData && <Spinner size="sm" className="text-primary" />}
            <Segmented value={range} onChange={setRange} options={RANGES} aria-label="Date range" />
            <Button asChild variant="gradient" className="hidden sm:inline-flex">
              <Link to="/sales/new">
                <ShoppingCartIcon /> New sale
              </Link>
            </Button>
          </>
        }
      />

      {isError && !data ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : (
        <>
          {/* ---------------- KPIs ---------------- */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              loading={isPending}
              label="Revenue"
              icon={IndianRupeeIcon}
              value={kpis && formatCurrency(kpis.revenue.value)}
              change={kpis?.revenue.change}
              hint={vs}
            />
            {isManager ? (
              <StatCard
                loading={isPending}
                label="Gross profit"
                icon={TrendingUpIcon}
                value={kpis && formatCurrency(kpis.profit.value)}
                change={kpis?.profit.change}
                hint={
                  kpis && Number(kpis.revenue.value)
                    ? `${((Number(kpis.profit.value) / Number(kpis.revenue.value)) * 100).toFixed(1)}% margin`
                    : undefined
                }
              />
            ) : (
              <StatCard
                loading={isPending}
                label="Units sold"
                icon={PackageIcon}
                value={kpis && formatNumber(kpis.units.value)}
                change={kpis?.units.change}
                hint={vs}
              />
            )}
            <StatCard
              loading={isPending}
              label="Orders"
              icon={ReceiptTextIcon}
              value={kpis && formatNumber(kpis.orders.value)}
              change={kpis?.orders.change}
              hint={vs}
            />
            <StatCard
              loading={isPending}
              label="Avg. order value"
              icon={WalletIcon}
              value={kpis && formatCurrency(kpis.average_order_value.value)}
              change={kpis?.average_order_value.change}
              hint={vs}
            />
          </div>

          {/* ---------------- Trend + stock ---------------- */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>{isManager ? "Revenue & profit" : "Revenue"}</CardTitle>
                <CardDescription>
                  {range === "12m" ? "Monthly" : "Daily"} totals, completed sales only
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-72 w-full rounded-xl" />
                ) : (
                  <RevenueChart data={data.revenue_trend} monthly={range === "12m"} showProfit={isManager} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock health</CardTitle>
                <CardDescription>
                  {data
                    ? `${formatNumber(data.inventory.products)} active products · ${formatNumber(data.inventory.units)} units`
                    : " "}
                </CardDescription>
                <CardAction>
                  <Button asChild variant="ghost" size="xs">
                    <Link to="/products?stock_status=low_stock">
                      View <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-5">
                {isPending ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <>
                    <StockHealth counts={data.inventory} />
                    {isManager && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl border p-3">
                          <p className="text-muted-foreground text-xs">Stock value (cost)</p>
                          <p className="tabular mt-0.5 font-semibold">
                            {formatCurrency(data.inventory.stock_value, { compact: true })}
                          </p>
                        </div>
                        <div className="rounded-xl border p-3">
                          <p className="text-muted-foreground text-xs">Retail value</p>
                          <p className="tabular mt-0.5 font-semibold">
                            {formatCurrency(data.inventory.retail_value, { compact: true })}
                          </p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                        Needs restock
                      </p>
                      {data.stock_alerts.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Everything is well stocked 🎉</p>
                      ) : (
                        <ul className="divide-y">
                          {data.stock_alerts.slice(0, 5).map((item) => (
                            <li key={item.id}>
                              <Link
                                to={`/products/${item.id}`}
                                className="hover:text-primary flex items-center gap-3 py-2 text-sm transition"
                              >
                                <TriangleAlertIcon
                                  className="size-4 shrink-0"
                                  style={{
                                    color:
                                      item.quantity === 0
                                        ? "var(--status-critical)"
                                        : "var(--status-warning)",
                                  }}
                                />
                                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                <span className="text-muted-foreground tabular text-xs">
                                  {item.quantity} / {item.reorder_level}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---------------- Breakdown ---------------- */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Sales by category</CardTitle>
                <CardDescription>Revenue share, {RANGE_TEXT[range]}</CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-56 w-full rounded-xl" />
                ) : (
                  <BarList
                    items={data.category_breakdown.map((c) => ({
                      key: c.category_id ?? c.name,
                      label: c.name,
                      dot: c.color,
                      value: Number(c.revenue),
                      display: `${c.share.toFixed(1)}%`,
                      hint: `${formatCurrency(c.revenue)} · ${formatNumber(c.units)} units`,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
                <CardDescription>By units sold</CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-56 w-full rounded-xl" />
                ) : (
                  <BarList
                    items={data.top_products.map((p) => ({
                      key: p.product_id,
                      label: (
                        <Link to={`/products/${p.product_id}`} className="hover:text-primary">
                          {p.name}
                        </Link>
                      ),
                      value: p.units,
                      display: `${formatNumber(p.units)} sold`,
                      hint: `${p.sku} · ${formatCurrency(p.revenue)} revenue`,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle>Recent sales</CardTitle>
                <CardAction>
                  <Button asChild variant="ghost" size="xs">
                    <Link to="/sales">
                      All sales <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="pt-2">
                {isPending ? (
                  <Skeleton className="h-56 w-full rounded-xl" />
                ) : data.recent_sales.length === 0 ? (
                  <EmptyState
                    icon={BoxesIcon}
                    title="No sales yet"
                    action={
                      <Button asChild size="sm">
                        <Link to="/sales/new">Record your first sale</Link>
                      </Button>
                    }
                    className="py-6"
                  />
                ) : (
                  <ul className="divide-y">
                    {data.recent_sales.map((sale) => (
                      <li key={sale.id}>
                        <Link
                          to={`/sales/${sale.id}`}
                          className="hover:text-primary flex items-center gap-3 py-2.5 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{sale.customer_name}</p>
                            <p className="text-muted-foreground text-xs">
                              <span className="font-mono">{sale.invoice_number}</span> ·{" "}
                              {timeAgo(sale.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="tabular text-sm font-semibold">{formatCurrency(sale.total)}</p>
                            {sale.status === "CANCELLED" && <SaleStatusBadge status="CANCELLED" />}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
