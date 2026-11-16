import { z } from "zod"

import { api } from "@/lib/api-client"
import { paginatedSchema } from "@/types/api"

export const notificationSchema = z.object({
  id: z.number(),
  kind: z.enum(["LOW_STOCK", "OUT_OF_STOCK", "RESTOCKED", "NEW_USER"]),
  kind_display: z.string(),
  level: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]),
  title: z.string(),
  message: z.string(),
  link: z.string(),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  created_at: z.string(),
})
export type Notification = z.infer<typeof notificationSchema>

const pageSchema = paginatedSchema(notificationSchema)

export const notificationsApi = {
  async list(params: { page?: number; page_size?: number; is_read?: boolean } = {}) {
    const { data } = await api.get("/notifications/", { params })
    return pageSchema.parse(data)
  },
  async unreadCount() {
    const { data } = await api.get("/notifications/unread-count/")
    return z.object({ count: z.number() }).parse(data).count
  },
  async markRead(id: number) {
    const { data } = await api.post(`/notifications/${id}/read/`)
    return notificationSchema.parse(data)
  },
  async markAllRead() {
    await api.post("/notifications/read-all/")
  },
  async clearRead() {
    await api.post("/notifications/clear-read/")
  },
}
