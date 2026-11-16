import type { ReactNode } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { FullscreenLoader } from "@/components/feedback/fullscreen-loader"
import type { Role } from "@/features/auth/schemas"
import { useSession } from "@/features/auth/session-provider"

import { ForbiddenPage } from "./status-pages"

/** Only signed-in users. Remembers where they were going. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useSession()
  const location = useLocation()
  if (status === "loading") return <FullscreenLoader message="Restoring your session" />
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children ?? <Outlet />
}

/** Login / register pages: bounce signed-in users to the app. */
export function GuestOnly({ children }: { children?: ReactNode }) {
  const { status } = useSession()
  if (status === "loading") return <FullscreenLoader message="Loading" />
  if (status === "authenticated") return <Navigate to="/dashboard" replace />
  return children ?? <Outlet />
}

/** Role gate inside the app shell (shows a 403 page instead of redirecting). */
export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const { hasRole } = useSession()
  if (!hasRole(...roles)) return <ForbiddenPage />
  return children ?? <Outlet />
}
