import { z } from "zod"

import { userSchema, type Role } from "@/features/auth/schemas"
import { api } from "@/lib/api-client"
import { paginatedSchema } from "@/types/api"

export const userStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  admins: z.number(),
  managers: z.number(),
  staff: z.number(),
})

export type TeamMemberInput = {
  username: string
  email: string
  first_name: string
  last_name: string
  role: Role
  job_title: string
  password?: string
  is_active?: boolean
}

const page = paginatedSchema(userSchema)

export const teamApi = {
  list: async (params: { search?: string; role?: string; page?: number }) =>
    page.parse((await api.get("/users/", { params })).data),
  stats: async () => userStatsSchema.parse((await api.get("/users/stats/")).data),
  create: async (input: TeamMemberInput) => userSchema.parse((await api.post("/users/", input)).data),
  update: async (id: number, input: Partial<TeamMemberInput>) =>
    userSchema.parse((await api.patch(`/users/${id}/`, input)).data),
}
