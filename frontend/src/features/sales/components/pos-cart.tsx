import { useState } from "react"
import { useAtom, useAtomValue } from "jotai"
import {
  IndianRupeeIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { AsyncCombobox } from "@/components/shared/combobox"
import { Segmented } from "@/components/shared/segmented"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { cartAtom, cartTotalsAtom, EMPTY_CART } from "@/store/cart.atoms"

import { PAYMENT_METHODS, salesApi, type CustomerOption } from "../api"
import { CustomerFormDialog } from "./customer-form-dialog"

const TAX_RATES = ["0", "5", "12", "18", "28"]

type Props = { onCheckout: () => void; submitting: boolean; error: string | null; className?: string }

export function PosCart({ onCheckout, submitting, error, className }: Props) {
  const [cart, setCart] = useAtom(cartAtom)
  const totals = useAtomValue(cartTotalsAtom)
  const [newCustomer, setNewCustomer] = useState<string | null>(null)

  const setQty = (id: number, quantity: number) =>
    setCart((c) => ({
      ...c,
      lines: c.lines
        .map((l) => (l.product.id === id ? { ...l, quantity: Math.min(l.product.quantity, quantity) } : l))
        .filter((l) => l.quantity > 0),
    }))

  const cashShortcuts = [
    totals.total,
    Math.ceil(totals.total / 100) * 100,
    Math.ceil(totals.total / 500) * 500,
  ]
    .filter((v, i, all) => v > 0 && all.indexOf(v) === i)
    .slice(0, 3)

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Customer */}
      <div className="space-y-2 border-b p-4">
        <Label>Customer</Label>
        <AsyncCombobox<CustomerOption>
          value={cart.customer}
          onChange={(customer) => setCart((c) => ({ ...c, customer }))}
          fetcher={salesApi.customerOptions}
          queryKey={queryKeys.customers.options}
          getKey={(c) => c.id}
          getLabel={(c) => c.name}
          placeholder="Walk-in customer"
          searchPlaceholder="Search name or phone…"
          renderItem={(c) => (
            <span className="block min-w-0">
              <span className="block truncate">{c.name}</span>
              {c.phone && <span className="text-muted-foreground text-xs">{c.phone}</span>}
            </span>
          )}
          footer={(close, term) => (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                close()
                setNewCustomer(term)
              }}
            >
              <UserPlusIcon /> New customer{term ? ` “${term}”` : ""}
            </Button>
          )}
        />
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        {cart.lines.length === 0 ? (
          <EmptyState
            icon={ShoppingCartIcon}
            title="Cart is empty"
            description="Tap products to add them."
            className="py-10"
          />
        ) : (
          <ul className="divide-y">
            {cart.lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-muted-foreground tabular text-xs">
                    {formatCurrency(product.selling_price)} × {quantity}
                  </p>
                </div>
                <div className="flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setQty(product.id, quantity - 1)}
                    className="text-muted-foreground hover:text-foreground grid size-8 place-items-center"
                    aria-label="Decrease"
                  >
                    {quantity === 1 ? (
                      <Trash2Icon className="size-3.5" />
                    ) : (
                      <MinusIcon className="size-3.5" />
                    )}
                  </button>
                  <span className="tabular w-7 text-center text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= product.quantity}
                    onClick={() => setQty(product.id, quantity + 1)}
                    className="text-muted-foreground hover:text-foreground grid size-8 place-items-center disabled:opacity-30"
                    aria-label="Increase"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                </div>
                <span className="tabular w-20 text-right text-sm font-semibold">
                  {formatCurrency(Number(product.selling_price) * quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payment */}
      <div className="space-y-4 border-t p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="discount">Discount</Label>
            <Input
              id="discount"
              inputMode="decimal"
              value={cart.discount}
              onChange={(e) => setCart((c) => ({ ...c, discount: e.target.value.replace(/[^\d.]/g, "") }))}
              placeholder="0"
              startAdornment={<IndianRupeeIcon />}
            />
          </div>
          <div className="space-y-1.5">
            <Label>GST</Label>
            <Select value={cart.taxRate} onValueChange={(taxRate) => setCart((c) => ({ ...c, taxRate }))}>
              <SelectTrigger aria-label="GST rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_RATES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Segmented
          value={cart.payment}
          onChange={(payment) =>
            setCart((c) => ({ ...c, payment, amountPaid: payment === "CASH" ? c.amountPaid : "" }))
          }
          options={PAYMENT_METHODS}
          className="grid w-full grid-cols-4"
          aria-label="Payment method"
        />

        {cart.payment === "CASH" && totals.total > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                value={cart.amountPaid}
                onChange={(e) =>
                  setCart((c) => ({ ...c, amountPaid: e.target.value.replace(/[^\d.]/g, "") }))
                }
                placeholder="Cash received"
                startAdornment={<IndianRupeeIcon />}
                aria-label="Cash received"
              />
              {cashShortcuts.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="tabular h-10 shrink-0"
                  onClick={() => setCart((c) => ({ ...c, amountPaid: String(v) }))}
                >
                  {v.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>
            {totals.change !== null && (
              <p
                className={cn("text-sm font-medium", totals.change < 0 ? "text-destructive" : "text-success")}
              >
                {totals.change < 0
                  ? `Short by ${formatCurrency(-totals.change)}`
                  : `Change to return: ${formatCurrency(totals.change)}`}
              </p>
            )}
          </div>
        )}

        <dl className="space-y-1.5 text-sm">
          <div className="text-muted-foreground flex justify-between">
            <dt>
              Subtotal · {totals.items} item{totals.items === 1 ? "" : "s"}
            </dt>
            <dd className="tabular">{formatCurrency(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="text-muted-foreground flex justify-between">
              <dt>Discount</dt>
              <dd className="tabular">− {formatCurrency(totals.discount)}</dd>
            </div>
          )}
          <div className="text-muted-foreground flex justify-between">
            <dt>GST ({cart.taxRate}%)</dt>
            <dd className="tabular">{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2.5">
            <dt className="font-semibold">Total</dt>
            <dd className="tabular text-2xl font-semibold tracking-tight">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>

        {error && <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>}

        <div className="flex gap-2">
          {cart.lines.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="px-4"
              onClick={() => setCart(EMPTY_CART)}
              aria-label="Clear cart"
            >
              <XIcon />
            </Button>
          )}
          <Button
            type="button"
            variant="gradient"
            size="xl"
            className="flex-1"
            disabled={!cart.lines.length || (totals.change !== null && totals.change < 0)}
            loading={submitting}
            loadingText="Processing sale…"
            onClick={onCheckout}
          >
            Charge {formatCurrency(totals.total)}
          </Button>
        </div>
      </div>

      <CustomerFormDialog
        open={newCustomer !== null}
        initialName={newCustomer ?? ""}
        onOpenChange={(open) => !open && setNewCustomer(null)}
        onSaved={(c) =>
          setCart((cart) => ({
            ...cart,
            customer: { id: c.id, name: c.name, phone: c.phone, email: c.email },
          }))
        }
      />
    </div>
  )
}
