/** Central registry of React Query keys – one place to invalidate from. */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    availability: (field: "username" | "email", value: string) =>
      ["auth", "availability", field, value] as const,
  },
  dashboard: (range: string) => ["dashboard", range] as const,
  notifications: {
    all: ["notifications"] as const,
    list: (filters: Record<string, unknown> = {}) => ["notifications", "list", filters] as const,
    unread: ["notifications", "unread-count"] as const,
  },
  categories: {
    all: ["categories"] as const,
    list: (params: object) => ["categories", "list", params] as const,
    options: ["categories", "options"] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params: object) => ["products", "list", params] as const,
    detail: (id: number) => ["products", "detail", id] as const,
    summary: ["products", "summary"] as const,
    search: (term: string, extra: object = {}) => ["products", "search", term, extra] as const,
  },
  movements: {
    all: ["movements"] as const,
    list: (params: object) => ["movements", "list", params] as const,
  },
  customers: {
    all: ["customers"] as const,
    list: (params: object) => ["customers", "list", params] as const,
    options: (term: string) => ["customers", "options", term] as const,
    sales: (id: number) => ["customers", id, "sales"] as const,
  },
  sales: {
    all: ["sales"] as const,
    list: (params: object) => ["sales", "list", params] as const,
    detail: (id: number) => ["sales", "detail", id] as const,
    summary: (params: object) => ["sales", "summary", params] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: object) => ["users", "list", params] as const,
    stats: ["users", "stats"] as const,
  },
} as const

/** Everything that changes when stock moves (sale, adjustment, movement). */
export const STOCK_DEPENDENT_KEYS = [
  ["products"],
  ["movements"],
  ["dashboard"],
  ["categories"],
  ["notifications"],
] as const
