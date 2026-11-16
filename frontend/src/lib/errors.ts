import { AxiosError } from "axios"
import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import { apiErrorBodySchema, type FieldErrors } from "@/types/api"

/** One error type for the whole app, whatever went wrong. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldErrors

  constructor(message: string, { status = 0, code = "error", fieldErrors = {} } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  get isNetwork() {
    return this.status === 0
  }
}

function toFieldErrors(details: Record<string, unknown> | undefined): FieldErrors {
  if (!details) return {}
  const out: FieldErrors = {}
  for (const [field, value] of Object.entries(details)) {
    if (Array.isArray(value)) out[field] = value.map(String)
    else if (typeof value === "string") out[field] = [value]
  }
  return out
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError("Can't reach the server. Check your connection and try again.", { code: "network" })
    }
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, details } = parsed.data.error
      return new ApiError(message, {
        status: error.response.status,
        code,
        fieldErrors: toFieldErrors(details),
      })
    }
    return new ApiError(`Request failed (${error.response.status}).`, { status: error.response.status })
  }
  if (error instanceof Error) return new ApiError(error.message)
  return new ApiError("Something went wrong.")
}

/**
 * Push server-side field errors into a react-hook-form instance.
 * Returns the message for errors that don't belong to a visible field.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  let unmatched: string | null = null
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: "server", message: messages[0] })
    } else {
      unmatched ??= messages[0] ?? null
    }
  }
  if (!Object.keys(error.fieldErrors).length) return error.message
  return unmatched
}
