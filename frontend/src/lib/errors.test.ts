import { AxiosError, AxiosHeaders } from "axios"
import { describe, expect, it, vi } from "vitest"

import { ApiError, applyFieldErrors, normalizeError } from "./errors"

const axiosError = (status: number, data: unknown) =>
  new AxiosError("fail", "ERR", undefined, undefined, {
    status,
    data,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe("normalizeError", () => {
  it("reads the unified Django error envelope", () => {
    const error = normalizeError(
      axiosError(400, {
        error: {
          code: "validation_error",
          message: "Taken",
          details: { username: ["This username is already taken."] },
        },
      }),
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe("validation_error")
    expect(error.fieldErrors.username).toEqual(["This username is already taken."])
  })

  it("flags network failures", () => {
    const error = normalizeError(new AxiosError("Network Error"))
    expect(error.isNetwork).toBe(true)
    expect(error.message).toMatch(/can't reach the server/i)
  })
})

describe("applyFieldErrors", () => {
  it("maps known fields and returns the rest as a banner message", () => {
    const setError = vi.fn()
    const error = new ApiError("bad", { fieldErrors: { email: ["Exists"], non_field_errors: ["Oops"] } })
    const banner = applyFieldErrors(error, setError, ["email"] as const)
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "Exists" })
    expect(banner).toBe("Oops")
  })
})
