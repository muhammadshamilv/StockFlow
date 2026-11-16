import { useState } from "react"
import { useAtom } from "jotai"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useSession } from "@/features/auth/session-provider"
import { logoutDialogOpenAtom } from "@/store/ui.atoms"

export function LogoutDialog() {
  const [open, setOpen] = useAtom(logoutDialogOpenAtom)
  const { logout } = useSession()
  const [loading, setLoading] = useState(false)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Sign out of StockFlow?"
      description="You'll need to sign in again to access your workspace on this device."
      confirmLabel="Sign out"
      tone="destructive"
      loading={loading}
      onConfirm={async () => {
        setLoading(true)
        try {
          await logout()
        } finally {
          setLoading(false)
          setOpen(false)
        }
      }}
    />
  )
}
