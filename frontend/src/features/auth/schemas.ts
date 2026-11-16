import { z } from "zod"

import { PASSWORD_RULES } from "@/lib/password"

/* ------------------------------ API models ------------------------------ */
export const roleSchema = z.enum(["ADMIN", "MANAGER", "STAFF"])
export type Role = z.infer<typeof roleSchema>

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  initials: z.string(),
  role: roleSchema,
  role_display: z.string(),
  phone: z.string(),
  job_title: z.string(),
  avatar: z.string().nullable(),
  is_active: z.boolean(),
  date_joined: z.string(),
  last_login: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const authUserResponseSchema = z.object({ user: userSchema })
export const registerResponseSchema = z.object({ detail: z.string(), user: userSchema })
export const messageSchema = z.object({ detail: z.string() })
export const availabilitySchema = z.object({
  field: z.enum(["username", "email"]),
  value: z.string(),
  available: z.boolean(),
  message: z.string(),
})

/* ------------------------------ Form schemas ------------------------------ */
const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28})[a-zA-Z0-9]$/

const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Keep it under 128 characters")
  .refine((value) => PASSWORD_RULES.filter((rule) => rule.test(value)).length >= 3, {
    message: "Mix upper & lowercase letters, numbers and symbols",
  })

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
  remember_me: z.boolean(),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(1, "Enter your first name").max(150),
    last_name: z.string().trim().max(150),
    username: z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(30, "At most 30 characters")
      .regex(USERNAME_RE, "Letters, numbers, . _ - only; must start and end with a letter or number"),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    password: strongPassword,
    password_confirm: z.string().min(1, "Confirm your password"),
    accept_terms: z.boolean().refine((value) => value, "Please accept the terms to continue"),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ["password_confirm"],
    message: "Passwords don't match",
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({ new_password: strongPassword, new_password_confirm: z.string().min(1, "Confirm your password") })
  .refine((data) => data.new_password === data.new_password_confirm, {
    path: ["new_password_confirm"],
    message: "Passwords don't match",
  })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: strongPassword,
    new_password_confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    path: ["new_password_confirm"],
    message: "Passwords don't match",
  })
  .refine((data) => data.new_password !== data.current_password, {
    path: ["new_password"],
    message: "Choose a password different from the current one",
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const profileSchema = z.object({
  first_name: z.string().trim().max(150),
  last_name: z.string().trim().max(150),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number"),
  job_title: z.string().trim().max(80),
})
export type ProfileValues = z.infer<typeof profileSchema>
