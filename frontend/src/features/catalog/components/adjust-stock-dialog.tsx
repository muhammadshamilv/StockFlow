import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ScaleIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { FormField } from "@/components/shared/form-field"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { applyFieldErrors, normalizeError } from "@/lib/errors"
import { cn } from "@/lib/utils"

import type { Product } from "../api"
import { useAdjustStock } from "../hooks"
import { adjustSchema, type AdjustValues } from "../schemas"

/** Stock-take: set the quantity to what was physically counted (managers). */
export function AdjustStockDialog({
  product,
  onOpenChange,
}: {
  product: Product | null
  onOpenChange: (open: boolean) => void
}) {
  const adjust = useAdjustStock()
  const form = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { counted_quantity: 0, note: "" },
  })
  const counted = useWatch({ control: form.control, name: "counted_quantity" })

  useEffect(() => {
    if (product) form.reset({ counted_quantity: product.quantity, note: "" })
  }, [product, form])

  if (!product) return null
  const diff = Number.isFinite(counted) ? counted - product.quantity : 0

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await adjust.mutateAsync({ id: product.id, ...values })
      onOpenChange(false)
    } catch (err) {
      const message = applyFieldErrors(normalizeError(err), form.setError, ["counted_quantity", "note"])
      if (message) form.setError("counted_quantity", { message })
    }
  })

  return (
    <ResponsiveDialog
      open={Boolean(product)}
      onOpenChange={onOpenChange}
      title="Adjust stock"
      description={`${product.name} · currently ${product.quantity} ${product.unit_display.toLowerCase()}`}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField
          label="Counted quantity"
          error={form.formState.errors.counted_quantity}
          hint={
            diff !== 0 ? (
              <span className={cn("font-medium", diff > 0 ? "text-success" : "text-destructive")}>
                {diff > 0 ? "+" : ""}
                {diff} units will be recorded as an adjustment
              </span>
            ) : (
              "Matches current stock"
            )
          }
        >
          {(f) => (
            <Input
              {...f}
              {...form.register("counted_quantity", { valueAsNumber: true })}
              type="number"
              min={0}
              autoFocus
            />
          )}
        </FormField>
        <FormField label="Reason" error={form.formState.errors.note}>
          {(f) => (
            <Input {...f} {...form.register("note")} placeholder="e.g. Damaged items, monthly stock count" />
          )}
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={diff === 0} loading={adjust.isPending} loadingText="Adjusting…">
            <ScaleIcon /> Save adjustment
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
