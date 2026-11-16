import { CrownIcon, BriefcaseIcon, UserIcon } from "lucide-react"

import { env } from "@/lib/env"

const DEMOS = [
  { role: "Admin", email: "admin@stockflow.dev", icon: CrownIcon },
  { role: "Manager", email: "manager@stockflow.dev", icon: BriefcaseIcon },
  { role: "Staff", email: "staff@stockflow.dev", icon: UserIcon },
] as const

export const DEMO_PASSWORD = "Demo@12345"

/** Portfolio helper: one-click demo accounts (toggle with VITE_SHOW_DEMO_LOGINS). */
export function DemoLogins({ onPick, disabled }: { onPick: (email: string) => void; disabled?: boolean }) {
  if (!env.VITE_SHOW_DEMO_LOGINS) return null
  return (
    <div className="mt-6 rounded-2xl border border-dashed p-4">
      <p className="text-muted-foreground mb-3 text-center text-xs font-medium">Try a demo account</p>
      <div className="grid grid-cols-3 gap-2">
        {DEMOS.map(({ role, email, icon: Icon }) => (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onPick(email)}
            className="group bg-surface/60 hover:border-primary/50 hover:bg-primary/8 flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition disabled:opacity-50"
          >
            <Icon className="text-muted-foreground group-hover:text-primary size-4 transition" />
            {role}
          </button>
        ))}
      </div>
    </div>
  )
}
