import { format, parseISO } from "date-fns"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import { formatCurrency } from "@/lib/format"

import type { Dashboard } from "../api"

type Point = { date: string; revenue: number; profit: number; orders: number }

const SERIES = [
  { key: "revenue", label: "Revenue", color: "var(--series-1)" },
  { key: "profit", label: "Gross profit", color: "var(--series-2)" },
] as const

function ChartTooltip({
  active,
  payload,
  label,
  monthly,
}: TooltipContentProps<number, string> & { monthly: boolean }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as Point
  return (
    <div className="bg-popover min-w-44 rounded-xl border px-3.5 py-3 text-sm shadow-xl">
      <p className="text-muted-foreground mb-2 text-xs font-medium">
        {format(parseISO(String(label)), monthly ? "MMMM yyyy" : "EEE, dd MMM yyyy")}
      </p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-muted-foreground inline-flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: entry.color }} />
            {SERIES.find((s) => s.key === entry.dataKey)?.label}
          </span>
          <span className="tabular font-medium">{formatCurrency(Number(entry.value))}</span>
        </div>
      ))}
      <div className="text-muted-foreground mt-1.5 flex justify-between border-t pt-1.5 text-xs">
        <span>Orders</span>
        <span className="tabular">{point.orders}</span>
      </div>
    </div>
  )
}

/**
 * Revenue vs gross profit over time – one shared ₹ axis (same unit, so no dual axis),
 * 2px lines, faint area fill, recessive hairline grid, crosshair + tooltip on hover.
 */
export function RevenueChart({
  data,
  monthly,
  showProfit,
}: {
  data: Dashboard["revenue_trend"]
  monthly: boolean
  showProfit: boolean
}) {
  const points: Point[] = data.map((d) => ({
    date: d.date,
    revenue: Number(d.revenue),
    profit: Number(d.profit),
    orders: d.orders,
  }))
  const series = showProfit ? SERIES : SERIES.slice(0, 1)

  return (
    <div>
      {series.length > 1 && (
        <div className="text-muted-foreground mb-3 flex flex-wrap gap-4 text-xs" aria-hidden>
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div
        className="h-72 w-full"
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} over time`}
      >
        <ResponsiveContainer>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickMargin={10}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value: string) => format(parseISO(value), monthly ? "MMM" : "dd MMM")}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35, strokeWidth: 1 }}
              content={(props) => (
                <ChartTooltip {...(props as TooltipContentProps<number, string>)} monthly={monthly} />
              )}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#fill-${s.key})`}
                activeDot={{ r: 4.5, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
