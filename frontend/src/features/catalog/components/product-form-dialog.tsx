import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { BarcodeIcon, IndianRupeeIcon, SaveIcon, TriangleAlertIcon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { applyFieldErrors, normalizeError } from "@/lib/errors"

import { UNITS, type Product } from "../api"
import { useCategoryOptions, useSaveProduct } from "../hooks"
import { productFormSchema, type ProductFormValues } from "../schemas"

const FIELDS = [
  "name",
  "sku",
  "barcode",
  "description",
  "category",
  "unit",
  "cost_price",
  "selling_price",
  "reorder_level",
  "opening_stock",
] as const

const toValues = (p?: Product | null): ProductFormValues => ({
  name: p?.name ?? "",
  sku: p?.sku ?? "",
  barcode: p?.barcode ?? "",
  description: p?.description ?? "",
  category: p?.category ?? 0,
  unit: p?.unit ?? "pcs",
  cost_price: p?.cost_price ?? "",
  selling_price: p?.selling_price ?? "",
  reorder_level: p?.reorder_level ?? 10,
  opening_stock: 0,
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSaved?: (p: Product) => void
}

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: Props) {
  const editing = Boolean(product)
  const save = useSaveProduct()
  const { data: categories = [] } = useCategoryOptions()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toValues(product),
  })
  const { register, control, handleSubmit, formState, reset, setError: setFieldError } = form
  const [cost, price] = useWatch({ control, name: ["cost_price", "selling_price"] })

  useEffect(() => {
    if (open) {
      reset(toValues(product))
      setError(null)
    }
  }, [open, product, reset])

  const margin = Number(price) > 0 ? ((Number(price) - Number(cost || 0)) / Number(price)) * 100 : null

  const onSubmit = handleSubmit(async ({ opening_stock, ...values }) => {
    setError(null)
    try {
      const saved = await save.mutateAsync({
        id: product?.id,
        input: editing ? values : { ...values, opening_stock },
      })
      toast.success(editing ? "Product updated" : `${saved.name} added`, { description: `SKU ${saved.sku}` })
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      setError(applyFieldErrors(normalizeError(err), setFieldError, FIELDS))
    }
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit product" : "Add product"}
      description={editing ? `SKU ${product?.sku}` : "Leave SKU empty to generate one automatically."}
      className="sm:max-w-2xl"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <AlertBanner tone="error" title={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product name" required error={formState.errors.name} className="sm:col-span-2">
            {(f) => <Input {...f} {...register("name")} autoFocus placeholder="e.g. Wireless Mouse" />}
          </FormField>

          <FormField label="Category" required error={formState.errors.category}>
            {(f) => (
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id={f.id} aria-invalid={f["aria-invalid"]}>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField label="Unit" error={formState.errors.unit}>
            {(f) => (
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={f.id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField label="Cost price" required error={formState.errors.cost_price}>
            {(f) => (
              <Input
                {...f}
                {...register("cost_price")}
                inputMode="decimal"
                placeholder="0.00"
                startAdornment={<IndianRupeeIcon />}
              />
            )}
          </FormField>

          <FormField
            label="Selling price"
            required
            error={formState.errors.selling_price}
            hint={
              margin === null ? undefined : margin < 0 ? (
                <span className="text-warning inline-flex items-center gap-1">
                  <TriangleAlertIcon className="size-3.5" /> Selling below cost ({margin.toFixed(1)}% margin)
                </span>
              ) : (
                <span className="text-success">{margin.toFixed(1)}% margin</span>
              )
            }
          >
            {(f) => (
              <Input
                {...f}
                {...register("selling_price")}
                inputMode="decimal"
                placeholder="0.00"
                startAdornment={<IndianRupeeIcon />}
              />
            )}
          </FormField>

          <FormField
            label="Reorder level"
            error={formState.errors.reorder_level}
            hint="Alert when stock falls to this"
          >
            {(f) => (
              <Input
                {...f}
                {...register("reorder_level", { valueAsNumber: true })}
                type="number"
                min={0}
                inputMode="numeric"
              />
            )}
          </FormField>

          {editing ? (
            <FormField
              label="Current stock"
              hint="Change stock from the product page (adjust or stock in/out)."
            >
              {(f) => (
                <Input
                  {...f}
                  value={`${product?.quantity} ${product?.unit_display.toLowerCase()}`}
                  disabled
                />
              )}
            </FormField>
          ) : (
            <FormField
              label="Opening stock"
              error={formState.errors.opening_stock}
              hint="Recorded as a stock-in movement"
            >
              {(f) => (
                <Input
                  {...f}
                  {...register("opening_stock", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  inputMode="numeric"
                />
              )}
            </FormField>
          )}

          <FormField label="SKU" error={formState.errors.sku}>
            {(f) => (
              <Input
                {...f}
                {...register("sku")}
                placeholder="Auto-generated"
                className="font-mono uppercase"
              />
            )}
          </FormField>

          <FormField label="Barcode" error={formState.errors.barcode}>
            {(f) => (
              <Input
                {...f}
                {...register("barcode")}
                placeholder="Optional"
                startAdornment={<BarcodeIcon />}
              />
            )}
          </FormField>

          <FormField label="Description" error={formState.errors.description} className="sm:col-span-2">
            {(f) => (
              <Textarea
                {...f}
                {...register("description")}
                rows={3}
                placeholder="Optional notes shown on the product page"
              />
            )}
          </FormField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} loadingText="Saving…">
            <SaveIcon /> {editing ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
