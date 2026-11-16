import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, AtSignIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Controller, useForm } from "react-hook-form"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { PasswordInput } from "@/components/shared/password-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { normalizeError } from "@/lib/errors"

import { AuthLayout } from "../components/auth-layout"
import { DEMO_PASSWORD, DemoLogins } from "../components/demo-logins"
import { useLogin } from "../hooks"
import { loginSchema, type LoginValues } from "../schemas"

type LocationState = {
  from?: string
  identifier?: string
  registered?: boolean
  passwordReset?: boolean
} | null

export default function LoginPage() {
  useDocumentTitle("Sign in")
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const state = location.state as LocationState
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: state?.identifier ?? "", password: "", remember_me: true },
  })
  const { register, handleSubmit, control, formState, setValue, setFocus } = form

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await login.mutateAsync(values)
      toast.success(`Welcome back, ${user.first_name || user.username}!`)
      navigate(state?.from && state.from !== "/login" ? state.from : "/dashboard", { replace: true })
    } catch (error) {
      setFormError(normalizeError(error).message)
      setShake((n) => n + 1)
      setValue("password", "")
      setFocus("password")
    }
  })

  const pickDemo = (email: string) => {
    setValue("identifier", email, { shouldValidate: true })
    setValue("password", DEMO_PASSWORD, { shouldValidate: true })
    void onSubmit()
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to manage your inventory, sales and team."
      footer={
        <>
          New to StockFlow?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5 space-y-3 empty:hidden">
        {params.get("expired") && (
          <AlertBanner tone="warning" title="Session expired">
            For your security you were signed out. Please sign in again.
          </AlertBanner>
        )}
        {state?.registered && (
          <AlertBanner tone="success" title="Account created">
            Sign in with your new credentials to get started.
          </AlertBanner>
        )}
        {state?.passwordReset && (
          <AlertBanner tone="success" title="Password updated">
            Sign in with your new password.
          </AlertBanner>
        )}
      </div>

      <AnimatePresence>
        {formError && (
          <motion.div
            key={shake}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="animate-shake mb-5"
          >
            <AlertBanner tone="error" title={formError} />
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="Username or email" error={formState.errors.identifier}>
          {(field) => (
            <Input
              {...field}
              {...register("identifier")}
              autoComplete="username"
              autoFocus={!state?.identifier}
              placeholder="you@company.com"
              startAdornment={<AtSignIcon />}
            />
          )}
        </FormField>

        <FormField
          label="Password"
          error={formState.errors.password}
          labelAside={
            <Link
              to="/forgot-password"
              className="text-primary text-xs font-medium hover:underline"
              tabIndex={0}
            >
              Forgot password?
            </Link>
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoFocus={Boolean(state?.identifier)}
              placeholder="Enter your password"
            />
          )}
        </FormField>

        <Controller
          control={control}
          name="remember_me"
          render={({ field }) => (
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember_me"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              <Label htmlFor="remember_me" className="text-muted-foreground font-normal">
                Keep me signed in for 30 days
              </Label>
            </div>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={login.isPending}
          loadingText="Signing in…"
        >
          Sign in <ArrowRightIcon />
        </Button>
      </form>

      <DemoLogins onPick={pickDemo} disabled={login.isPending} />
    </AuthLayout>
  )
}
