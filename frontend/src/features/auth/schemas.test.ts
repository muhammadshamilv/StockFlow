import { describe, expect, it } from "vitest"

import { registerSchema } from "./schemas"

const valid = {
  first_name: "Shamil",
  last_name: "",
  username: "shamil",
  email: "Shamil@Example.com",
  password: "Sup3r$ecret",
  password_confirm: "Sup3r$ecret",
  accept_terms: true,
}

describe("registerSchema", () => {
  it("accepts a valid payload and lowercases the email", () => {
    const parsed = registerSchema.parse(valid)
    expect(parsed.email).toBe("shamil@example.com")
  })

  it.each([
    [{ password_confirm: "nope" }, "password_confirm"],
    [{ username: "a" }, "username"],
    [{ username: "-bad-" }, "username"],
    [{ email: "not-email" }, "email"],
    [{ password: "aaaaaaaa", password_confirm: "aaaaaaaa" }, "password"],
    [{ accept_terms: false }, "accept_terms"],
  ])("rejects %o on %s", (override, field) => {
    const result = registerSchema.safeParse({ ...valid, ...override })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field)
  })
})
