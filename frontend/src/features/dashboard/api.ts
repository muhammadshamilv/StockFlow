import { z } from "zod"

import { api } from "@/lib/api-client"
import type { DashboardRange } from "@/store/preferences.atoms"

const metric = z.object({ value: z.string(), previous: z.string(), change: z.number().nullable() })

export const dashboardSchema = z.object({
  range: z.enum(["7d", "30d", "90d", "12m"]),
  period: z.object({ start: z.string(), end: z.string() }),
  kpis: z.object({
    revenue: metric,
    profit: metric,
    orders: metric,
    average_order_value: metric,
    units: metric,
  }),
  inventory: z.object({
    products: z.number(),
    units: z.number(),
    stock_value: z.string(),
    retail_value: z.string(),
    in_stock: z.number(),
    low_stock: z.number(),
    out_of_stock: z.number(),
    categories: z.number(),
    customers: z.number(),
  }),
  revenue_trend: z.array(
    z.object({ date: z.string(), revenue: z.string(), profit: z.string(), orders: z.number() }),
  ),
  category_breakdown: z.array(
    z.object({
      category_id: z.number().nullable(),
      name: z.string(),
      color: z.string(),
      revenue: z.string(),
      units: z.number(),
      share: z.number(),
    }),
  ),
  top_products: z.array(
    z.object({
      product_id: z.number(),
      name: z.string(),
      sku: z.string(),
      units: z.number(),
      revenue: z.string(),
    }),
  ),
  stock_alerts: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      sku: z.string(),
      quantity: z.number(),
      reorder_level: z.number(),
    }),
  ),
  recent_sales: z.array(
    z.object({
      id: z.number(),
      invoice_number: z.string(),
      customer_name: z.string(),
      total: z.string(),
      status: z.string(),
      payment_method: z.string(),
      created_at: z.string(),
    }),
  ),
})
export type Dashboard = z.infer<typeof dashboardSchema>

export const dashboardApi = {
  get: async (range: DashboardRange) =>
    dashboardSchema.parse((await api.get("/analytics/dashboard/", { params: { range } })).data),
}
