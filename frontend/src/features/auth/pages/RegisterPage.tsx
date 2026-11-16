import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AtSignIcon, CheckIcon, MailIcon, UserIcon, UserPlusIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { PasswordInput } from "@/components/shared/password-input"
import { PasswordStrength } from "@/components/shared/password-strength"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { applyFieldErrors, normalizeError } from "@/lib/errors"

import { AuthLayout } from "../components/auth-layout"
import { AvailabilityIndicator } from "../components/availability-indicator"
import { useAvailability, useRegister } from "../hooks"
import { registerSchema, type RegisterValues } from "../schemas"

const FIELDS = [
  "first_name",
  "last_name",
  "username",
  "email",
  "password",
  "password_confirm",
  "accept_terms",
] as const

export default function RegisterPage() {
  useDocumentTitle("Create account")
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const [termsOpen, setTermsOpen] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      password: "",
      password_confirm: "",
      accept_terms: false,
    },
  })
  const { register, handleSubmit, control, formState, setError } = form
  const [username, email, password, passwordConfirm] = useWatch({
    control,
    name: ["username", "email", "password", "password_confirm"],
  })

  const usernameOk = registerSchema.shape.username.safeParse(username).success
  const emailOk = registerSchema.shape.email.safeParse(email).success
  const usernameCheck = useAvailability("username", username, usernameOk)
  const emailCheck = useAvailability("email", email, emailOk)
  const passwordsMatch = Boolean(passwordConfirm) && password === passwordConfirm

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    if (usernameCheck.status === "taken")
      return setError("username", { message: "This username is already taken." })
    if (emailCheck.status === "taken")
      return setError("email", { message: "An account with this email already exists." })
    try {
      const result = await registerMutation.mutateAsync(values)
      toast.success("Account created!", {
        description:
          result.user.role === "ADMIN"
            ? "You're the first user, so you're the workspace Admin."
            : "Sign in to get started.",
      })
      navigate("/login", { replace: true, state: { identifier: values.email, registered: true } })
    } catch (error) {
      setFormError(applyFieldErrors(normalizeError(error), setError, FIELDS))
    }
  })

  return (
    <AuthLayout
      title="Create your account"
      description="Set up StockFlow in under a minute. The first account becomes the workspace admin."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AnimatePresence>
        {formError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5"
          >
            <AlertBanner tone="error" title={formError} />
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="First name" required error={formState.errors.first_name}>
            {(field) => (
              <Input
                {...field}
                {...register("first_name")}
                autoComplete="given-name"
                autoFocus
                placeholder="Shamil"
                startAdornment={<UserIcon />}
              />
            )}
          </FormField>
          <FormField label="Last name" error={formState.errors.last_name}>
            {(field) => (
              <Input
                {...field}
                {...register("last_name")}
                autoComplete="family-name"
                placeholder="Muhammed"
              />
            )}
          </FormField>
        </div>

        <FormField
          label="Username"
          required
          error={
            formState.errors.username ??
            (usernameCheck.status === "taken" ? { message: usernameCheck.message } : undefined)
          }
          hint={
            usernameCheck.status === "available" ? (
              <span className="text-success">{usernameCheck.message}</span>
            ) : (
              "3–30 characters. You can sign in with it."
            )
          }
        >
          {(field) => (
            <Input
              {...field}
              {...register("username")}
              autoComplete="username"
              placeholder="shamil"
              startAdornment={<AtSignIcon />}
              endAdornment={<AvailabilityIndicator {...usernameCheck} />}
            />
          )}
        </FormField>

        <FormField
          label="Work email"
          required
          error={
            formState.errors.email ??
            (emailCheck.status === "taken" ? { message: emailCheck.message } : undefined)
          }
        >
          {(field) => (
            <Input
              {...field}
              {...register("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              startAdornment={<MailIcon />}
              endAdornment={<AvailabilityIndicator {...emailCheck} />}
            />
          )}
        </FormField>

        <FormField label="Password" required error={formState.errors.password}>
          {(field) => (
            <div className="space-y-3">
              <PasswordInput
                {...field}
                {...register("password")}
                autoComplete="new-password"
                placeholder="Create a strong password"
              />
              <PasswordStrength value={password} />
            </div>
          )}
        </FormField>

        <FormField
          label="Confirm password"
          required
          error={formState.errors.password_confirm}
          hint={
            passwordsMatch ? (
              <span className="text-success inline-flex items-center gap-1">
                <CheckIcon className="size-3.5" /> Passwords match
              </span>
            ) : undefined
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password_confirm")}
              autoComplete="new-password"
              placeholder="Repeat your password"
              showCapsLockHint={false}
            />
          )}
        </FormField>

        <Controller
          control={control}
          name="accept_terms"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="accept_terms"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  onBlur={field.onBlur}
                  aria-invalid={Boolean(fieldState.error)}
                />
                <Label htmlFor="accept_terms" className="text-muted-foreground leading-snug font-normal">
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="text-primary font-medium hover:underline"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="text-primary font-medium hover:underline"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </Label>
              </div>
              {fieldState.error && (
                <p className="text-destructive pl-7 text-xs font-medium">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        <Button
          type="submit"
          size="lg"
          variant="gradient"
          className="w-full"
          loading={registerMutation.isPending}
          loadingText="Creating account…"
        >
          <UserPlusIcon /> Create account
        </Button>
      </form>

      <ResponsiveDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        title="Terms & Privacy"
        description="The short version – this is a portfolio demo."
      >
        <div className="text-muted-foreground space-y-3 text-sm">
          <p>
            StockFlow stores the business data you enter (products, sales, customers) to provide the service.
          </p>
          <p>
            Passwords are hashed with Django's PBKDF2 hasher. Sessions use httpOnly, SameSite cookies with
            CSRF protection.
          </p>
          <p>We never sell your data. You can ask an administrator to deactivate your account at any time.</p>
          <Button
            className="mt-2 w-full"
            onClick={() => {
              form.setValue("accept_terms", true, { shouldValidate: true })
              setTermsOpen(false)
            }}
          >
            I agree
          </Button>
        </div>
      </ResponsiveDialog>
    </AuthLayout>
  )
}
