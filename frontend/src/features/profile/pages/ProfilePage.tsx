import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  BriefcaseIcon,
  KeyRoundIcon,
  MailIcon,
  PhoneIcon,
  SaveIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { PasswordInput } from "@/components/shared/password-input"
import { PasswordStrength } from "@/components/shared/password-strength"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChangePassword, useUpdateProfile } from "@/features/auth/hooks"
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
  type User,
} from "@/features/auth/schemas"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { applyFieldErrors, normalizeError } from "@/lib/errors"
import { formatDateTime } from "@/lib/format"

import { AvatarUpload } from "../components/avatar-upload"

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [avatar, setAvatar] = useState<{ file: File | null; removed: boolean }>({
    file: null,
    removed: false,
  })
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      job_title: user.job_title,
    },
  })
  const dirty = form.formState.isDirty || avatar.file !== null || avatar.removed

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = await update.mutateAsync({
        ...values,
        ...(avatar.file ? { avatar: avatar.file } : {}),
        ...(avatar.removed ? { remove_avatar: true } : {}),
      })
      form.reset({
        first_name: saved.first_name,
        last_name: saved.last_name,
        email: saved.email,
        phone: saved.phone,
        job_title: saved.job_title,
      })
      setAvatar({ file: null, removed: false })
    } catch (err) {
      setError(
        applyFieldErrors(normalizeError(err), form.setError, [
          "first_name",
          "last_name",
          "email",
          "phone",
          "job_title",
        ]),
      )
    }
  })

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>This is how teammates see you across StockFlow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <AlertBanner tone="error" title={error} />}
          <AvatarUpload
            current={user.avatar}
            initials={user.initials}
            file={avatar.file}
            removed={avatar.removed}
            onChange={setAvatar}
            onError={(message) => toast.error(message)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="First name" error={form.formState.errors.first_name}>
              {(f) => <Input {...f} {...form.register("first_name")} startAdornment={<UserIcon />} />}
            </FormField>
            <FormField label="Last name" error={form.formState.errors.last_name}>
              {(f) => <Input {...f} {...form.register("last_name")} />}
            </FormField>
            <FormField label="Email" error={form.formState.errors.email}>
              {(f) => <Input {...f} {...form.register("email")} type="email" startAdornment={<MailIcon />} />}
            </FormField>
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
            <FormField label="Job title" error={form.formState.errors.job_title} className="sm:col-span-2">
              {(f) => (
                <Input
                  {...f}
                  {...form.register("job_title")}
                  placeholder="Store manager"
                  startAdornment={<BriefcaseIcon />}
                />
              )}
            </FormField>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <p className="text-muted-foreground text-xs">Username: @{user.username} (can't be changed)</p>
          <Button type="submit" disabled={!dirty} loading={update.isPending} loadingText="Saving…">
            <SaveIcon /> Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function SecurityForm({ user }: { user: User }) {
  const change = useChangePassword()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { current_password: "", new_password: "", new_password_confirm: "" },
  })
  const newPassword = useWatch({ control: form.control, name: "new_password" })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await change.mutateAsync(values)
      form.reset()
    } catch (err) {
      setError(
        applyFieldErrors(normalizeError(err), form.setError, [
          "current_password",
          "new_password",
          "new_password_confirm",
        ]),
      )
    }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Changing your password signs you out on every other device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <AlertBanner tone="error" title={error} />}
            <FormField label="Current password" error={form.formState.errors.current_password}>
              {(f) => (
                <PasswordInput
                  {...f}
                  {...form.register("current_password")}
                  autoComplete="current-password"
                />
              )}
            </FormField>
            <FormField label="New password" error={form.formState.errors.new_password}>
              {(f) => (
                <div className="space-y-3">
                  <PasswordInput {...f} {...form.register("new_password")} autoComplete="new-password" />
                  <PasswordStrength value={newPassword} />
                </div>
              )}
            </FormField>
            <FormField label="Confirm new password" error={form.formState.errors.new_password_confirm}>
              {(f) => (
                <PasswordInput
                  {...f}
                  {...form.register("new_password_confirm")}
                  autoComplete="new-password"
                  showCapsLockHint={false}
                />
              )}
            </FormField>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={change.isPending} loadingText="Updating…">
              <KeyRoundIcon /> Update password
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="text-success size-4" /> Session security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            [
              "Auth method",
              <Badge key="m" variant="success">
                httpOnly cookie
              </Badge>,
            ],
            [
              "CSRF protection",
              <Badge key="c" variant="success">
                Enabled
              </Badge>,
            ],
            [
              "Role",
              <Badge key="r" variant="outline">
                {user.role_display}
              </Badge>,
            ],
            ["Last sign-in", user.last_login ? formatDateTime(user.last_login) : "—"],
            ["Member since", formatDateTime(user.date_joined)],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilePage() {
  useDocumentTitle("Profile")
  const { user } = useSession()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") === "security" ? "security" : "profile"
  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader title="Account settings" description="Manage your profile and keep your account secure." />
      <Tabs
        value={tab}
        onValueChange={(value) => setParams(value === "profile" ? {} : { tab: value }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRoundIcon /> Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileForm user={user} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityForm user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
