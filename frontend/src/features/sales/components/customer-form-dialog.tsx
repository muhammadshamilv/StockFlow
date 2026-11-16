import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { MailIcon, PhoneIcon, SaveIcon, UserIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { applyFieldErrors, normalizeError } from "@/lib/errors"

import type { Customer } from "../api"
import { useSaveCustomer } from "../hooks"

const schema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(150),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number"),
  email: z.union([z.literal(""), z.string().trim().pipe(z.email("Enter a valid email"))]),
  address: z.string().trim().max(500),
  tax_id: z.string().trim().max(20),
  notes: z.string().trim().max(1000),
})
type Values = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  /** Prefill the name (e.g. typed in the POS search) */
  initialName?: string
  onSaved?: (customer: Customer) => void
}

export function CustomerFormDialog({ open, onOpenChange, customer, initialName = "", onSaved }: Props) {
  const save = useSaveCustomer()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    setError(null)
    form.reset({
      name: customer?.name ?? initialName,
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      tax_id: customer?.tax_id ?? "",
      notes: customer?.notes ?? "",
    })
  }, [open, customer, initialName, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = await save.mutateAsync({ id: customer?.id, input: values })
      toast.success(customer ? "Customer updated" : `${saved.name} added`)
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      setError(
        applyFieldErrors(normalizeError(err), form.setError, [
          "name",
          "phone",
          "email",
          "address",
          "tax_id",
          "notes",
        ]),
      )
    }
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? "Edit customer" : "New customer"}
      className="sm:max-w-xl"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <AlertBanner tone="error" title={error} />}
        <FormField label="Name" required error={form.formState.errors.name}>
          {(f) => (
            <Input
              {...f}
              {...form.register("name")}
              autoFocus
              placeholder="Customer or business name"
              startAdornment={<UserIcon />}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone" error={form.formState.errors.phone}>
            {(f) => (
              <Input
                {...f}
                {...form.register("phone")}
                inputMode="tel"
                placeholder="+91 98765 43210"
                startAdornment={<PhoneIcon />}
              />
            )}
          </FormField>
          <FormField label="Email" error={form.formState.errors.email}>
            {(f) => (
              <Input
                {...f}
                {...form.register("email")}
                type="email"
                placeholder="Optional"
                startAdornment={<MailIcon />}
              />
            )}
          </FormField>
        </div>
        <FormField label="Address" error={form.formState.errors.address}>
          {(f) => (
            <Textarea {...f} {...form.register("address")} rows={2} placeholder="Printed on invoices" />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="GSTIN" error={form.formState.errors.tax_id}>
            {(f) => (
              <Input
                {...f}
                {...form.register("tax_id")}
                placeholder="For B2B invoices"
                className="uppercase"
              />
            )}
          </FormField>
          <FormField label="Notes" error={form.formState.errors.notes}>
            {(f) => <Input {...f} {...form.register("notes")} placeholder="Optional" />}
          </FormField>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} loadingText="Saving…">
            <SaveIcon /> {customer ? "Save changes" : "Add customer"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
