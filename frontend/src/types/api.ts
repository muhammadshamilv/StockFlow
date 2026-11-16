import { z } from "zod"

/** Envelope returned by apps.core.pagination.StandardPagination */
export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    count: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number(),
    next: z.number().nullable(),
    previous: z.number().nullable(),
    results: z.array(item),
  })

export type Paginated<T> = {
  count: number
  page: number
  page_size: number
  total_pages: number
  next: number | null
  previous: number | null
  results: T[]
}

/** Unified error body from apps.core.exceptions */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
})

export type FieldErrors = Record<string, string[]>
