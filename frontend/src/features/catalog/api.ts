import { z } from "zod"

import { api } from "@/lib/api-client"
import { paginatedSchema } from "@/types/api"

const money = z.string() // DRF serialises decimals as strings – keep precision, format at the edge

/* ------------------------------ Categories ------------------------------ */
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  color: z.string(),
  is_active: z.boolean(),
  product_count: z.number(),
  stock_units: z.number(),
  stock_value: money,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Category = z.infer<typeof categorySchema>

export const categoryOptionSchema = z.object({ id: z.number(), name: z.string(), color: z.string() })
export type CategoryOption = z.infer<typeof categoryOptionSchema>

export type CategoryInput = { name: string; description: string; color: string; is_active?: boolean }

/* ------------------------------ Products ------------------------------ */
export const stockStatusSchema = z.enum(["in_stock", "low_stock", "out_of_stock"])
export type StockStatus = z.infer<typeof stockStatusSchema>

export const UNITS = [
  ["pcs", "Pieces"],
  ["pack", "Packs"],
  ["box", "Boxes"],
  ["kg", "Kilograms"],
  ["g", "Grams"],
  ["l", "Litres"],
  ["ml", "Millilitres"],
  ["m", "Metres"],
] as const
export type Unit = (typeof UNITS)[number][0]

export const productSchema = z.object({
  id: z.number(),
  sku: z.string(),
  barcode: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.number(),
  category_name: z.string(),
  category_color: z.string(),
  unit: z.string(),
  unit_display: z.string(),
  cost_price: money,
  selling_price: money,
  quantity: z.number(),
  reorder_level: z.number(),
  stock_status: stockStatusSchema,
  stock_status_display: z.string(),
  margin_percent: z.string().nullable(),
  stock_value: money,
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Product = z.infer<typeof productSchema>

export const productOptionSchema = z.object({
  id: z.number(),
  sku: z.string(),
  barcode: z.string(),
  name: z.string(),
  category: z.number(),
  category_name: z.string(),
  selling_price: money,
  quantity: z.number(),
  unit: z.string(),
  stock_status: stockStatusSchema,
})
export type ProductOption = z.infer<typeof productOptionSchema>

export const productSummarySchema = z.object({
  total: z.number(),
  in_stock: z.number(),
  low_stock: z.number(),
  out_of_stock: z.number(),
  archived: z.number(),
})

export type ProductInput = {
  name: string
  sku: string
  barcode: string
  description: string
  category: number
  unit: string
  cost_price: string
  selling_price: string
  reorder_level: number
  opening_stock?: number
  is_active?: boolean
}

export type ProductListParams = {
  page?: number
  page_size?: number
  search?: string
  category?: string
  stock_status?: string
  is_active?: string
  ordering?: string
}

const productPage = paginatedSchema(productSchema)
const categoryPage = paginatedSchema(categorySchema)

export const catalogApi = {
  categories: async (params: { search?: string; page_size?: number } = {}) =>
    categoryPage.parse((await api.get("/categories/", { params: { page_size: 100, ...params } })).data),
  categoryOptions: async () =>
    z.array(categoryOptionSchema).parse((await api.get("/categories/options/")).data),
  createCategory: async (input: CategoryInput) =>
    categorySchema.parse((await api.post("/categories/", input)).data),
  updateCategory: async (id: number, input: Partial<CategoryInput>) =>
    categorySchema.parse((await api.patch(`/categories/${id}/`, input)).data),
  deleteCategory: async (id: number) => {
    await api.delete(`/categories/${id}/`)
  },

  products: async (params: ProductListParams) =>
    productPage.parse((await api.get("/products/", { params })).data),
  product: async (id: number) => productSchema.parse((await api.get(`/products/${id}/`)).data),
  productSummary: async () => productSummarySchema.parse((await api.get("/products/summary/")).data),
  productOptions: async (params: { search?: string; category?: string; in_stock?: boolean }) =>
    z.array(productOptionSchema).parse((await api.get("/products/options/", { params })).data),
  createProduct: async (input: ProductInput) =>
    productSchema.parse((await api.post("/products/", input)).data),
  updateProduct: async (id: number, input: Partial<ProductInput>) =>
    productSchema.parse((await api.patch(`/products/${id}/`, input)).data),
  deleteProduct: async (id: number) => {
    await api.delete(`/products/${id}/`)
  },
  adjustStock: async (id: number, input: { counted_quantity: number; note: string }) =>
    productSchema.parse((await api.post(`/products/${id}/adjust-stock/`, input)).data),
}
