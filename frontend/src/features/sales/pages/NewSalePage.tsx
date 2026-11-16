import { useState } from "react"
import { createPortal } from "react-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import { ChevronUpIcon, ShoppingCartIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import type { ProductOption } from "@/features/catalog/api"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { normalizeError } from "@/lib/errors"
import { formatCurrency } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import { cartAtom, cartTotalsAtom, EMPTY_CART } from "@/store/cart.atoms"

import { SaleRecordedError, type SaleDetail } from "../api"
import { PosCart } from "../components/pos-cart"
import { PosProductGrid } from "../components/pos-product-grid"
import { SaleSuccessDialog } from "../components/sale-success-dialog"
import { useCreateSale } from "../hooks"

/** Point of sale: tap products → cart → charge. Works with a USB barcode scanner. */
export default function NewSalePage() {
  useDocumentTitle("New sale")
  const client = useQueryClient()
  const navigate = useNavigate()
  const [cart, setCart] = useAtom(cartAtom)
  const totals = useAtomValue(cartTotalsAtom)
  const createSale = useCreateSale()
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<SaleDetail | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const inCart = (id: number) => cart.lines.find((l) => l.product.id === id)?.quantity ?? 0

  const add = (product: ProductOption) =>
    setCart((c) => {
      const existing = c.lines.find((l) => l.product.id === product.id)
      if (existing) {
        return {
          ...c,
          lines: c.lines.map((l) =>
            l.product.id === product.id ? { ...l, quantity: Math.min(product.quantity, l.quantity + 1) } : l,
          ),
        }
      }
      return { ...c, lines: [...c.lines, { product, quantity: 1 }] }
    })

  const checkout = async () => {
    setError(null)
    try {
      const sale = await createSale.mutateAsync({
        customer: cart.customer?.id ?? null,
        items: cart.lines.map((l) => ({ product: l.product.id, quantity: l.quantity })),
        payment_method: cart.payment,
        discount_amount: totals.discount.toFixed(2),
        tax_rate: cart.taxRate,
        amount_paid: cart.payment === "CASH" && cart.amountPaid ? cart.amountPaid : null,
        notes: cart.notes,
      })
      setCart(EMPTY_CART)
      setCartOpen(false)
      setCompleted(sale)
    } catch (err) {
      if (err instanceof SaleRecordedError) {
        setCart(EMPTY_CART)
        setCartOpen(false)
        toast.warning("Sale recorded", { description: err.message })
        if (err.saleId) navigate(`/sales/${err.saleId}`)
        return
      }
      const apiError = normalizeError(err)
      setError(apiError.message)
      if (apiError.code === "insufficient_stock")
        void client.invalidateQueries({ queryKey: queryKeys.products.all })
    }
  }

  const cartPanel = <PosCart onCheckout={checkout} submitting={createSale.isPending} error={error} />

  return (
    <div className="space-y-5">
      {/* Desktop is a full-height POS layout, so the title only shows on smaller screens */}
      <PageHeader
        className="lg:hidden"
        title="New sale"
        description="Tap products or scan a barcode. Totals update live; stock is checked at checkout."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <PosProductGrid onAdd={add} inCart={inCart} />
        <aside className="bg-card sticky top-24 hidden h-[calc(100dvh-8rem)] overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] lg:block">
          {cartPanel}
        </aside>
      </div>

      {/* Mobile: cart summary bar above the tab bar → drawer.
          Portaled to <body>: the page-transition wrapper uses a CSS transform,
          which would otherwise trap `position: fixed` inside the page. */}
      {createPortal(
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="bg-brand-gradient fixed inset-x-4 bottom-24 z-30 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-white shadow-[0_12px_40px_-10px_var(--primary)] transition active:scale-[0.98] md:bottom-6 lg:hidden"
        >
          <span className="relative">
            <ShoppingCartIcon className="size-5" />
            {totals.items > 0 && (
              <span className="text-primary tabular absolute -top-2 -right-2.5 grid size-5 place-items-center rounded-full bg-white text-[11px] font-bold">
                {totals.items}
              </span>
            )}
          </span>
          <span className="flex-1 text-left text-sm font-medium">
            {totals.items ? "Review cart" : "Cart is empty"}
          </span>
          <span className="tabular font-semibold">{formatCurrency(totals.total)}</span>
          <ChevronUpIcon className="size-4" />
        </button>,
        document.body,
      )}
      <Drawer open={cartOpen} onOpenChange={setCartOpen}>
        <DrawerContent className="h-[88dvh]">
          <DrawerTitle className="sr-only">Cart</DrawerTitle>
          {cartPanel}
        </DrawerContent>
      </Drawer>

      <SaleSuccessDialog sale={completed} onClose={() => setCompleted(null)} />
    </div>
  )
}
