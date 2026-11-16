import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowDownLeftIcon, ArrowUpRightIcon, IndianRupeeIcon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { AlertBanner } from "@/components/shared/alert-banner"
import { AsyncCombobox } from "@/components/shared/combobox"
import { FormField } from "@/components/shared/form-field"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Segmented } from "@/components/shared/segmented"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { catalogApi, type ProductOption } from "@/features/catalog/api"
import { applyFieldErrors, normalizeError } from "@/lib/errors"
import { queryKeys } from "@/lib/query-keys"

import { useCreateMovement } from "../hooks"

const schema = z.object({
  movement_type: z.enum(["IN", "OUT"]),
  product: z.custom<ProductOption | null>().refine((v) => Boolean(v), "Choose a product"),
  quantity: z.number({ error: "Enter a quantity" }).int().min(1, "At least 1"),
  unit_cost: z
    .string()
    .trim()
    .refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v), "Use a number like 120.50"),
  reference: z.string().trim().max(60),
  note: z.string().trim().max(255),
})
type Values = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select a product (from the product page) */
  product?: ProductOption | null
  defaultType?: "IN" | "OUT"
}

/** Record goods received (IN) or removed (OUT – damage, internal use…). */
export function MovementFormDialog({ open, onOpenChange, product = null, defaultType = "IN" }: Props) {
  const create = useCreateMovement()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      movement_type: defaultType,
      product,
      quantity: 1,
      unit_cost: "",
      reference: "",
      note: "",
    },
  })
  const [type, selected] = useWatch({ control: form.control, name: ["movement_type", "product"] })

  useEffect(() => {
    if (open) {
      setError(null)
      form.reset({ movement_type: defaultType, product, quantity: 1, unit_cost: "", reference: "", note: "" })
    }
  }, [open, product, defaultType, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const movement = await create.mutateAsync({
        product: values.product!.id,
        movement_type: values.movement_type,
        quantity: values.quantity,
        unit_cost: values.movement_type === "IN" && values.unit_cost ? values.unit_cost : null,
        reference: values.reference,
        note: values.note,
      })
      toast.success(values.movement_type === "IN" ? "Stock received" : "Stock removed", {
        description: `${movement.product_name}: ${movement.quantity_before} → ${movement.quantity_after}`,
      })
      onOpenChange(false)
    } catch (err) {
      setError(
        applyFieldErrors(normalizeError(err), form.setError, ["quantity", "unit_cost", "reference", "note"]),
      )
    }
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record stock movement"
      description="Every movement is written to the permanent stock ledger."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <AlertBanner tone="error" title={error} />}
        <Controller
          control={form.control}
          name="movement_type"
          render={({ field }) => (
            <Segmented
              value={field.value}
              onChange={field.onChange}
              className="grid w-full grid-cols-2"
              aria-label="Movement type"
              options={[
                {
                  value: "IN",
                  label: (
                    <>
                      <ArrowDownLeftIcon className="size-4" /> Stock in
                    </>
                  ),
                },
                {
                  value: "OUT",
                  label: (
                    <>
                      <ArrowUpRightIcon className="size-4" /> Stock out
                    </>
                  ),
                },
              ]}
            />
          )}
        />

        <FormField label="Product" required error={form.formState.errors.product}>
          {(f) => (
            <Controller
              control={form.control}
              name="product"
              render={({ field }) => (
                <AsyncCombobox<ProductOption>
                  id={f.id}
                  invalid={f["aria-invalid"]}
                  value={field.value}
                  onChange={field.onChange}
                  fetcher={(term) => catalogApi.productOptions({ search: term })}
                  queryKey={(term) => queryKeys.products.search(term, { picker: true })}
                  getKey={(p) => p.id}
                  getLabel={(p) => p.name}
                  placeholder="Search by name, SKU or barcode"
                  renderItem={(p) => (
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate">{p.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">{p.sku}</span>
                      </span>
                      <span className="text-muted-foreground tabular text-xs">{p.quantity} in stock</span>
                    </div>
                  )}
                />
              )}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Quantity"
            required
            error={form.formState.errors.quantity}
            hint={selected ? `Currently ${selected.quantity} in stock` : undefined}
          >
            {(f) => (
              <Input
                {...f}
                {...form.register("quantity", { valueAsNumber: true })}
                type="number"
                min={1}
                inputMode="numeric"
              />
            )}
          </FormField>
          {type === "IN" ? (
            <FormField
              label="Unit cost"
              error={form.formState.errors.unit_cost}
              hint="Updates the weighted average cost"
            >
              {(f) => (
                <Input
                  {...f}
                  {...form.register("unit_cost")}
                  inputMode="decimal"
                  placeholder="Optional"
                  startAdornment={<IndianRupeeIcon />}
                />
              )}
            </FormField>
          ) : (
            <FormField label="Reference" error={form.formState.errors.reference}>
              {(f) => <Input {...f} {...form.register("reference")} placeholder="Optional" />}
            </FormField>
          )}
        </div>
        {type === "IN" && (
          <FormField label="Reference" error={form.formState.errors.reference}>
            {(f) => (
              <Input
                {...f}
                {...form.register("reference")}
                placeholder="Supplier bill / PO number (optional)"
              />
            )}
          </FormField>
        )}
        <FormField label="Note" error={form.formState.errors.note}>
          {(f) => (
            <Input
              {...f}
              {...form.register("note")}
              placeholder={type === "IN" ? "e.g. Weekly delivery" : "e.g. Damaged in transit"}
            />
          )}
        </FormField>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} loadingText="Saving…">
            {type === "IN" ? <ArrowDownLeftIcon /> : <ArrowUpRightIcon />}
            {type === "IN" ? "Receive stock" : "Remove stock"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
