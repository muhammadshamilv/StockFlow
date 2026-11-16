import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AtSignIcon, MailIcon, SaveIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { PasswordInput } from "@/components/shared/password-input"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Segmented } from "@/components/shared/segmented"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Role, User } from "@/features/auth/schemas"
import { applyFieldErrors, normalizeError } from "@/lib/errors"

import { useSaveMember } from "../hooks"

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Everything, including team management.",
  MANAGER: "Products, pricing, stock adjustments, cancellations and reports.",
  STAFF: "Sell at the counter, receive stock and manage customers.",
}

const schema = z.object({
  first_name: z.string().trim().max(150),
  last_name: z.string().trim().max(150),
  username: z.string().trim().min(3, "At least 3 characters").max(30),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  job_title: z.string().trim().max(80),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  is_active: z.boolean(),
  password: z.string(),
})
type Values = z.infer<typeof schema>

type Props = { open: boolean; onOpenChange: (open: boolean) => void; member?: User | null }

export function MemberFormDialog({ open, onOpenChange, member }: Props) {
  const save = useSaveMember()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    setError(null)
    form.reset({
      first_name: member?.first_name ?? "",
      last_name: member?.last_name ?? "",
      username: member?.username ?? "",
      email: member?.email ?? "",
      job_title: member?.job_title ?? "",
      role: member?.role ?? "STAFF",
      is_active: member?.is_active ?? true,
      password: "",
    })
  }, [open, member, form])

  const onSubmit = form.handleSubmit(async ({ password, ...values }) => {
    setError(null)
    if (!member && password.length < 8) return form.setError("password", { message: "At least 8 characters" })
    try {
      await save.mutateAsync({ id: member?.id, input: password ? { ...values, password } : values })
      toast.success(member ? "Member updated" : `${values.username} added to the team`)
      onOpenChange(false)
    } catch (err) {
      setError(
        applyFieldErrors(normalizeError(err), form.setError, [
          "first_name",
          "last_name",
          "username",
          "email",
          "job_title",
          "role",
          "is_active",
          "password",
        ]),
      )
    }
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? `Edit ${member.full_name}` : "Add team member"}
      description={
        member
          ? undefined
          : "Share the username and temporary password with them – they can change it in Profile."
      }
      className="sm:max-w-xl"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <AlertBanner tone="error" title={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" error={form.formState.errors.first_name}>
            {(f) => <Input {...f} {...form.register("first_name")} autoFocus />}
          </FormField>
          <FormField label="Last name" error={form.formState.errors.last_name}>
            {(f) => <Input {...f} {...form.register("last_name")} />}
          </FormField>
          <FormField label="Username" required error={form.formState.errors.username}>
            {(f) => <Input {...f} {...form.register("username")} startAdornment={<AtSignIcon />} />}
          </FormField>
          <FormField label="Email" required error={form.formState.errors.email}>
            {(f) => <Input {...f} {...form.register("email")} type="email" startAdornment={<MailIcon />} />}
          </FormField>
        </div>
        <FormField label="Job title" error={form.formState.errors.job_title}>
          {(f) => <Input {...f} {...form.register("job_title")} placeholder="e.g. Cashier" />}
        </FormField>
        <Controller
          control={form.control}
          name="role"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label>Role</Label>
              <Segmented
                value={field.value}
                onChange={field.onChange}
                className="grid w-full grid-cols-3"
                aria-label="Role"
                options={[
                  { value: "STAFF", label: "Staff" },
                  { value: "MANAGER", label: "Manager" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
              <p className={fieldState.error ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                {fieldState.error?.message ?? ROLE_HELP[field.value]}
              </p>
            </div>
          )}
        />
        <FormField
          label={member ? "Reset password" : "Temporary password"}
          required={!member}
          error={form.formState.errors.password}
          hint={
            member
              ? "Leave empty to keep the current password. Resetting signs them out everywhere."
              : undefined
          }
        >
          {(f) => (
            <PasswordInput
              {...f}
              {...form.register("password")}
              autoComplete="new-password"
              placeholder={member ? "Unchanged" : "At least 8 characters"}
            />
          )}
        </FormField>
        {member && (
          <Controller
            control={form.control}
            name="is_active"
            render={({ field, fieldState }) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border p-3.5">
                <div>
                  <Label htmlFor="is_active">Active account</Label>
                  <p
                    className={
                      fieldState.error
                        ? "text-destructive mt-1 text-xs"
                        : "text-muted-foreground mt-1 text-xs"
                    }
                  >
                    {fieldState.error?.message ??
                      "Deactivated members can't sign in. Their sales history is kept."}
                  </p>
                </div>
                <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} loadingText="Saving…">
            <SaveIcon /> {member ? "Save changes" : "Add member"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
