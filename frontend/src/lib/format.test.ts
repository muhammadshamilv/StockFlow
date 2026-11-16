import { describe, expect, it } from "vitest"

import { formatCurrency, formatPercent } from "./format"

describe("format", () => {
  it("formats rupees in the Indian numbering system", () => {
    expect(formatCurrency("888729.54")).toBe("₹8,88,729.54")
  })

  it.each([
    [13.14, "+13.1%"],
    [-16.4, "-16.4%"],
    [null, "—"],
    [26508.8, ">+999%"],
  ])("formatPercent(%s) -> %s", (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })
})
