import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PasswordInput } from "./password-input"

describe("PasswordInput", () => {
  it("toggles visibility", async () => {
    render(<PasswordInput aria-label="Password" defaultValue="secret" />)
    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")
    await userEvent.click(screen.getByRole("button", { name: /show password/i }))
    expect(input).toHaveAttribute("type", "text")
    await userEvent.click(screen.getByRole("button", { name: /hide password/i }))
    expect(input).toHaveAttribute("type", "password")
  })
})
