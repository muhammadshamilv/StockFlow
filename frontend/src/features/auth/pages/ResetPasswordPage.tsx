import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRoundIcon, LinkIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { EmptyState } from "@/components/feedback/empty-state"
import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { PasswordInput } from "@/components/shared/password-input"
import { PasswordStrength } from "@/components/shared/password-strength"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { applyFieldErrors, normalizeError } from "@/lib/errors"

import { AuthLayout } from "../components/auth-layout"
import { useConfirmPasswordReset } from "../hooks"
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas"

export default function ResetPasswordPage() {
  useDocumentTitle("Choose a new password")
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const uid = params.get("uid") ?? ""
  const token = params.get("token") ?? ""
  const confirm = useConfirmPasswordReset()
  const [linkError, setLinkError] = useState<string | null>(null)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { new_password: "", new_password_confirm: "" },
  })
  const newPassword = useWatch({ control: form.control, name: "new_password" })

  const onSubmit = form.handleSubmit(async (values) => {
    setLinkError(null)
    try {
      await confirm.mutateAsync({ uid, token, ...values })
      navigate("/login", { replace: true, state: { passwordReset: true } })
    } catch (error) {
      const apiError = normalizeError(error)
      if (apiError.fieldErrors.token || apiError.fieldErrors.uid) {
        setLinkError(apiError.fieldErrors.token?.[0] ?? "This reset link is invalid.")
        return
      }
      setLinkError(applyFieldErrors(apiError, form.setError, ["new_password", "new_password_confirm"]))
    }
  })

  if (!uid || !token) {
    return (
      <AuthLayout title="Invalid link" description="This page needs a valid reset link from your email.">
        <EmptyState
          icon={LinkIcon}
          title="Reset link missing"
          description="Request a new link and open it from the same device."
          action={
            <Button asChild>
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          }
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description="Make it strong – you'll use it to sign in from now on."
    >
      {linkError && (
        <AlertBanner tone="error" title={linkError} className="mb-5">
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Request a new reset link →
          </Link>
        </AlertBanner>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="New password" error={form.formState.errors.new_password}>
          {(field) => (
            <div className="space-y-3">
              <PasswordInput
                {...field}
                {...form.register("new_password")}
                autoComplete="new-password"
                autoFocus
                placeholder="New password"
              />
              <PasswordStrength value={newPassword} />
            </div>
          )}
        </FormField>
        <FormField label="Confirm new password" error={form.formState.errors.new_password_confirm}>
          {(field) => (
            <PasswordInput
              {...field}
              {...form.register("new_password_confirm")}
              autoComplete="new-password"
              placeholder="Repeat new password"
              showCapsLockHint={false}
            />
          )}
        </FormField>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={confirm.isPending}
          loadingText="Updating password…"
        >
          <KeyRoundIcon /> Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
