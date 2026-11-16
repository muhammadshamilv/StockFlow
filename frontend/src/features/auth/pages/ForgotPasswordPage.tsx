import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, MailCheckIcon, MailIcon, SendIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { normalizeError } from "@/lib/errors"

import { AuthLayout } from "../components/auth-layout"
import { useRequestPasswordReset } from "../hooks"
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas"

const RESEND_SECONDS = 30

export default function ForgotPasswordPage() {
  useDocumentTitle("Reset password")
  const request = useRequestPasswordReset()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const send = async (email: string) => {
    setError(null)
    try {
      await request.mutateAsync(email)
      setSentTo(email)
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(normalizeError(err).message)
    }
  }

  const onSubmit = form.handleSubmit(({ email }) => send(email))

  return (
    <AuthLayout
      title={sentTo ? "Check your inbox" : "Forgot your password?"}
      description={
        sentTo
          ? "Follow the link in the email to choose a new password."
          : "Enter your email and we'll send you a secure reset link."
      }
      footer={
        <Link
          to="/login"
          className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
        >
          <ArrowLeftIcon className="size-4" /> Back to sign in
        </Link>
      }
    >
      {error && <AlertBanner tone="error" title={error} className="mb-5" />}
      <AnimatePresence mode="wait">
        {sentTo ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            <div className="bg-card flex flex-col items-center rounded-2xl border p-7 text-center">
              <div className="relative mb-4">
                <span className="bg-success/30 absolute inset-0 rounded-2xl blur-xl" />
                <div className="bg-success/15 text-success relative grid size-14 place-items-center rounded-2xl">
                  <MailCheckIcon className="size-7" />
                </div>
              </div>
              <p className="text-muted-foreground text-sm">If an account exists for</p>
              <p className="mt-0.5 font-medium break-all">{sentTo}</p>
              <p className="text-muted-foreground mt-3 text-xs">
                the link arrives within a minute and expires in 1 hour. Check spam if you don't see it.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={cooldown > 0}
              loading={request.isPending}
              loadingText="Resending…"
              onClick={() => send(sentTo)}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
            </Button>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="text-muted-foreground hover:text-foreground w-full text-center text-sm"
            >
              Use a different email
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            noValidate
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FormField label="Email address" error={form.formState.errors.email}>
              {(field) => (
                <Input
                  {...field}
                  {...form.register("email")}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  startAdornment={<MailIcon />}
                />
              )}
            </FormField>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={request.isPending}
              loadingText="Sending link…"
            >
              <SendIcon /> Send reset link
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}
