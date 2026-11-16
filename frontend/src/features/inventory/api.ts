import { z } from "zod"

import { api } from "@/lib/api-client"
import { paginatedSchema } from "@/types/api"

export const movementTypeSchema = z.enum(["IN", "OUT", "ADJUSTMENT", "SALE", "RETURN"])
export type MovementType = z.infer<typeof movementTypeSchema>

export const movementSchema = z.object({
  id: z.number(),
  product: z.number(),
  product_name: z.string(),
  product_sku: z.string(),
  product_unit: z.string(),
  movement_type: movementTypeSchema,
  movement_type_display: z.string(),
  direction: z.enum(["in", "out"]),
  quantity: z.number(),
  signed_quantity: z.number(),
  quantity_before: z.number(),
  quantity_after: z.number(),
  unit_cost: z.string().nullable(),
  reference: z.string(),
  note: z.string(),
  created_by: z.number().nullable(),
  created_by_name: z.string().nullable(),
  created_at: z.string(),
})
export type Movement = z.infer<typeof movementSchema>

export type MovementInput = {
  product: number
  movement_type: "IN" | "OUT" | "ADJUSTMENT"
  quantity: number
  unit_cost?: string | null
  reference?: string
  note?: string
}

export type MovementParams = {
  page?: number
  page_size?: number
  search?: string
  product?: number
  movement_type?: string
  direction?: string
}

const page = paginatedSchema(movementSchema)

export const inventoryApi = {
  movements: async (params: MovementParams) =>
    page.parse((await api.get("/stock-movements/", { params })).data),
  createMovement: async (input: MovementInput) =>
    movementSchema.parse((await api.post("/stock-movements/", input)).data),
}
