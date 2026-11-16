import { z } from "zod"

/** Validated, typed access to import.meta.env – the app fails fast on bad config. */
const schema = z.object({
  VITE_API_URL: z.string().min(1).default("/api/v1"),
  VITE_APP_NAME: z.string().default("StockFlow"),
  VITE_SHOW_DEMO_LOGINS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
})

export const env = schema.parse(import.meta.env)
