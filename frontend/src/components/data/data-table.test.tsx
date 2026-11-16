import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTable, type Column } from "./data-table"

type Row = { id: number; name: string }
const columns: Column<Row>[] = [{ key: "name", header: "Name", sortKey: "name", cell: (r) => r.name }]

describe("DataTable", () => {
  it("cycles ordering asc → desc → off on header clicks", async () => {
    const onOrderingChange = vi.fn()
    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={[{ id: 1, name: "A" }]}
        rowKey={(r) => r.id}
        ordering=""
        onOrderingChange={onOrderingChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /name/i }))
    expect(onOrderingChange).toHaveBeenLastCalledWith("name")

    rerender(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        ordering="name"
        onOrderingChange={onOrderingChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /name/i }))
    expect(onOrderingChange).toHaveBeenLastCalledWith("-name")

    rerender(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        ordering="-name"
        onOrderingChange={onOrderingChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /name/i }))
    expect(onOrderingChange).toHaveBeenLastCalledWith("")
  })

  it("renders the empty state", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} empty={<p>Nothing here</p>} />)
    expect(screen.getByText("Nothing here")).toBeInTheDocument()
  })
})
