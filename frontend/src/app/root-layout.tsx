import { Outlet, ScrollRestoration } from "react-router-dom"

import { RouteProgress } from "@/components/feedback/route-progress"
import { SessionProvider } from "@/features/auth/session-provider"

/** Root route: session context (needs the router for navigation) + top progress bar. */
export function RootLayout() {
  return (
    <SessionProvider>
      <RouteProgress />
      <Outlet />
      <ScrollRestoration />
    </SessionProvider>
  )
}
