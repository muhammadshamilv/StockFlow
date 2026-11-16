import { describe, expect, it } from "vitest"

import { PASSWORD_RULES, passwordStrength } from "./password"

describe("passwordStrength", () => {
  it.each([
    ["", 0],
    ["abc", 0], // "Too short"
    ["password123", 1], // common word capped
    ["abcdefgh", 1],
    ["Abcdefgh1", 3],
    ["Abcdefgh1!", 4],
    ["Very$trongPass123", 4],
  ])("%s -> score %i", (value, score) => {
    expect(passwordStrength(value).score).toBe(score)
  })

  it("exposes four human-readable rules", () => {
    expect(PASSWORD_RULES.map((rule) => rule.test("Ab1!xxxx"))).toEqual([true, true, true, true])
  })
})
