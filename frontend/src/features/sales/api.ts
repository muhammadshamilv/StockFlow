import { z } from "zod"

import { api } from "@/lib/api-client"
import { paginatedSchema } from "@/types/api"

/* ------------------------------ Customers ------------------------------ */
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  tax_id: z.string(),
  notes: z.string(),
  is_active: z.boolean(),
  orders_count: z.number(),
  total_spent: z.string(),
  last_purchase_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Customer = z.infer<typeof customerSchema>

export const customerOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
})
export type CustomerOption = z.infer<typeof customerOptionSchema>

export type CustomerInput = {
  name: string
  phone: string
  email: string
  address: string
  tax_id: string
  notes: string
}

/* ------------------------------ Sales ------------------------------ */
export const saleStatusSchema = z.enum(["COMPLETED", "CANCELLED"])
export const paymentMethodSchema = z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank" },
]

export const saleListSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  customer: z.number().nullable(),
  customer_name: z.string(),
  status: saleStatusSchema,
  status_display: z.string(),
  payment_method: paymentMethodSchema,
  payment_method_display: z.string(),
  items_count: z.number(),
  total: z.string(),
  created_by_name: z.string().nullable(),
  created_at: z.string(),
})
export type SaleListItem = z.infer<typeof saleListSchema>

export const saleDetailSchema = saleListSchema.omit({ items_count: true }).extend({
  customer_detail: customerOptionSchema.nullable(),
  items: z.array(
    z.object({
      id: z.number(),
      product: z.number(),
      product_name: z.string(),
      sku: z.string(),
      quantity: z.number(),
      unit_price: z.string(),
      line_total: z.string(),
    }),
  ),
  subtotal: z.string(),
  discount_amount: z.string(),
  tax_rate: z.string(),
  tax_amount: z.string(),
  net_revenue: z.string(),
  cost_total: z.string().nullable(),
  gross_profit: z.string().nullable(),
  amount_paid: z.string().nullable(),
  change_due: z.string().nullable(),
  notes: z.string(),
  cancelled_at: z.string().nullable(),
  cancelled_by_name: z.string().nullable(),
  cancel_reason: z.string(),
})
export type SaleDetail = z.infer<typeof saleDetailSchema>

export const salesSummarySchema = z.object({
  revenue: z.string(),
  tax: z.string(),
  orders: z.number(),
  cancelled: z.number(),
  average_order_value: z.string(),
})

export type SaleInput = {
  customer: number | null
  items: { product: number; quantity: number; unit_price?: string | null }[]
  payment_method: PaymentMethod
  discount_amount: string
  tax_rate: string
  amount_paid?: string | null
  notes?: string
}

export type SaleParams = {
  page?: number
  page_size?: number
  search?: string
  status?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  customer?: number
  ordering?: string
}

/**
 * Thrown when the server CONFIRMED a sale but the response couldn't be read.
 * The POS must still clear the cart – retrying would charge the customer twice.
 */
export class SaleRecordedError extends Error {
  readonly saleId: number | undefined

  constructor(saleId: number | undefined) {
    super("The sale was recorded, but its details couldn't be displayed.")
    this.name = "SaleRecordedError"
    this.saleId = saleId
  }
}

const customerPage = paginatedSchema(customerSchema)
const salePage = paginatedSchema(saleListSchema)

export const salesApi = {
  customers: async (params: { page?: number; search?: string; ordering?: string }) =>
    customerPage.parse((await api.get("/customers/", { params })).data),
  customerOptions: async (search: string) =>
    z.array(customerOptionSchema).parse((await api.get("/customers/options/", { params: { search } })).data),
  createCustomer: async (input: CustomerInput) =>
    customerSchema.parse((await api.post("/customers/", input)).data),
  updateCustomer: async (id: number, input: Partial<CustomerInput>) =>
    customerSchema.parse((await api.patch(`/customers/${id}/`, input)).data),
  deleteCustomer: async (id: number) => {
    await api.delete(`/customers/${id}/`)
  },
  customerSales: async (id: number, page = 1) =>
    salePage.parse((await api.get(`/customers/${id}/sales/`, { params: { page, page_size: 10 } })).data),

  sales: async (params: SaleParams) => salePage.parse((await api.get("/sales/", { params })).data),
  sale: async (id: number) => saleDetailSchema.parse((await api.get(`/sales/${id}/`)).data),
  summary: async (params: SaleParams) =>
    salesSummarySchema.parse((await api.get("/sales/summary/", { params })).data),
  createSale: async (input: SaleInput) => {
    const { data } = await api.post("/sales/", input)
    const parsed = saleDetailSchema.safeParse(data)
    if (!parsed.success) {
      console.error("Unexpected sale response", parsed.error)
      throw new SaleRecordedError((data as { id?: number })?.id)
    }
    return parsed.data
  },
  cancelSale: async (id: number, reason: string) =>
    saleDetailSchema.parse((await api.post(`/sales/${id}/cancel/`, { reason })).data),
}
