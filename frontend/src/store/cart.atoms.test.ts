import { createStore } from "jotai"
import { describe, expect, it } from "vitest"

import type { ProductOption } from "@/features/catalog/api"

import { cartAtom, cartTotalsAtom, EMPTY_CART } from "./cart.atoms"

const product = (id: number, price: string, quantity = 50): ProductOption => ({
  id,
  sku: `SKU-${id}`,
  barcode: "",
  name: `Product ${id}`,
  category: 1,
  category_name: "Test",
  selling_price: price,
  quantity,
  unit: "pcs",
  stock_status: "in_stock",
})

describe("cartTotalsAtom", () => {
  it("matches the server's maths: discount before GST, rounded to paise", () => {
    const store = createStore()
    store.set(cartAtom, {
      ...EMPTY_CART,
      lines: [
        { product: product(1, "500.00"), quantity: 3 },
        { product: product(2, "200.00"), quantity: 1 },
      ],
      discount: "100",
      taxRate: "18",
      payment: "CASH",
      amountPaid: "2000",
    })
    expect(store.get(cartTotalsAtom)).toEqual({
      items: 4,
      subtotal: 1700,
      discount: 100,
      tax: 288,
      total: 1888,
      change: 112,
    })
  })

  it("never lets the discount exceed the subtotal", () => {
    const store = createStore()
    store.set(cartAtom, {
      ...EMPTY_CART,
      lines: [{ product: product(1, "80.00"), quantity: 1 }],
      discount: "999",
      taxRate: "0",
    })
    expect(store.get(cartTotalsAtom).total).toBe(0)
  })
})
