import { atom } from "jotai"
import { atomWithStorage, createJSONStorage } from "jotai/utils"

import type { ProductOption } from "@/features/catalog/api"
import type { CustomerOption, PaymentMethod } from "@/features/sales/api"

export type CartLine = { product: ProductOption; quantity: number }

export type Cart = {
  lines: CartLine[]
  customer: CustomerOption | null
  discount: string
  taxRate: string
  payment: PaymentMethod
  amountPaid: string
  notes: string
}

export const EMPTY_CART: Cart = {
  lines: [],
  customer: null,
  discount: "",
  taxRate: "18",
  payment: "UPI",
  amountPaid: "",
  notes: "",
}

/** Point-of-sale cart – survives a page refresh (sessionStorage), cleared after checkout. */
export const cartAtom = atomWithStorage<Cart>(
  "sf-pos-cart",
  EMPTY_CART,
  createJSONStorage(() => sessionStorage),
  { getOnInit: true },
)

const money = (n: number) => Math.round(n * 100) / 100

/** Derived totals (display only – the server recalculates authoritatively). */
export const cartTotalsAtom = atom((get) => {
  const cart = get(cartAtom)
  const subtotal = money(cart.lines.reduce((sum, l) => sum + Number(l.product.selling_price) * l.quantity, 0))
  const discount = Math.min(subtotal, Math.max(0, Number(cart.discount) || 0))
  const taxable = money(subtotal - discount)
  const tax = money((taxable * (Number(cart.taxRate) || 0)) / 100)
  const total = money(taxable + tax)
  const paid = Number(cart.amountPaid) || 0
  return {
    items: cart.lines.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    discount,
    tax,
    total,
    change: cart.amountPaid ? money(paid - total) : null,
  }
})
