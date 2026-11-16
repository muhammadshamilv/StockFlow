import { api, ensureCsrfCookie } from "@/lib/api-client"
import { ApiError } from "@/lib/errors"

import {
  authUserResponseSchema,
  availabilitySchema,
  messageSchema,
  registerResponseSchema,
  userSchema,
  type ChangePasswordValues,
  type LoginValues,
  type ProfileValues,
  type RegisterValues,
  type User,
} from "./schemas"

let csrfReady: Promise<unknown> | null = null
/** The CSRF cookie only needs to be fetched once per page load. */
export const primeCsrf = () => (csrfReady ??= ensureCsrfCookie().catch(() => (csrfReady = null)))

export const authApi = {
  /** Returns the current user, or null when not signed in. */
  async me(): Promise<User | null> {
    await primeCsrf()
    try {
      const { data } = await api.get("/auth/me/")
      return userSchema.parse(data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },

  async login(values: LoginValues): Promise<User> {
    await primeCsrf()
    const { data } = await api.post("/auth/login/", values)
    return authUserResponseSchema.parse(data).user
  },

  async register(values: RegisterValues) {
    await primeCsrf()
    const { data } = await api.post("/auth/register/", values)
    return registerResponseSchema.parse(data)
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout/")
  },

  async availability(field: "username" | "email", value: string) {
    const { data } = await api.get("/auth/availability/", { params: { [field]: value } })
    return availabilitySchema.parse(data)
  },

  async requestPasswordReset(email: string) {
    await primeCsrf()
    const { data } = await api.post("/auth/password/reset/", { email })
    return messageSchema.parse(data)
  },

  async confirmPasswordReset(payload: {
    uid: string
    token: string
    new_password: string
    new_password_confirm: string
  }) {
    await primeCsrf()
    const { data } = await api.post("/auth/password/reset/confirm/", payload)
    return messageSchema.parse(data)
  },

  async changePassword(values: ChangePasswordValues): Promise<User> {
    const { data } = await api.post("/auth/password/change/", values)
    return authUserResponseSchema.parse(data).user
  },

  async updateProfile(
    values: Partial<ProfileValues> & { avatar?: File | null; remove_avatar?: boolean },
  ): Promise<User> {
    const hasFile = values.avatar instanceof File
    const body = hasFile ? toFormData(values) : values
    const { data } = await api.patch("/auth/me/", body)
    return userSchema.parse(data)
  },
}

function toFormData(values: Record<string, unknown>): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue
    form.append(key, value instanceof File ? value : String(value))
  }
  return form
}
