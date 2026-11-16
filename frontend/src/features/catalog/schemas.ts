import { z } from "zod"

const price = z
  .string()
  .trim()
  .min(1, "Required")
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Use a number like 199 or 199.50")

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(200),
  sku: z
    .string()
    .trim()
    .max(40)
    .refine((v) => !v || /^[A-Za-z0-9-_]+$/.test(v), "Letters, numbers, - and _ only"),
  barcode: z.string().trim().max(64),
  description: z.string().trim().max(1000),
  category: z.number({ error: "Choose a category" }).int().positive("Choose a category"),
  unit: z.string().min(1),
  cost_price: price,
  selling_price: price,
  reorder_level: z.number({ error: "Required" }).int().min(0).max(1_000_000),
  opening_stock: z.number({ error: "Required" }).int().min(0).max(1_000_000),
})
export type ProductFormValues = z.infer<typeof productFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  description: z.string().trim().max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const adjustSchema = z.object({
  counted_quantity: z.number({ error: "Enter the counted quantity" }).int().min(0),
  note: z.string().trim().max(255),
})
export type AdjustValues = z.infer<typeof adjustSchema>
