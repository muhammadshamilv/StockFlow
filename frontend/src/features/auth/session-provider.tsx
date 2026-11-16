import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { onSessionExpired } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import { authApi } from "./api"
import type { LoginValues, Role, User } from "./schemas"

type SessionStatus = "loading" | "authenticated" | "anonymous"

type SessionContextValue = {
  user: User | null
  status: SessionStatus
  isAuthenticated: boolean
  hasRole: (...roles: Role[]) => boolean
  isManager: boolean
  login: (values: LoginValues) => Promise<User>
  logout: (options?: { silent?: boolean }) => Promise<void>
  setUser: (user: User) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * Owns the signed-in user (Context API) on top of React Query's cache.
 * Tokens never touch JS – the browser holds them as httpOnly cookies.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: user, isPending } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { errorMessage: false },
  })

  const setUser = useCallback(
    (next: User | null) => queryClient.setQueryData(queryKeys.auth.me, next),
    [queryClient],
  )

  /** Drop every cached query EXCEPT the session itself (removing an in-flight
   *  observed query would leave its observer stuck in "pending"). */
  const dropAppData = useCallback(
    () => queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" }),
    [queryClient],
  )

  // Refresh token rejected anywhere in the app -> back to login
  useEffect(
    () =>
      onSessionExpired(() => {
        // Anonymous visitor probing /auth/me: authApi.me() already resolves to null
        if (!queryClient.getQueryData(queryKeys.auth.me)) return
        dropAppData()
        setUser(null)
        toast.warning("Your session expired", { description: "Please sign in again to continue." })
        navigate("/login?expired=1", { replace: true })
      }),
    [dropAppData, navigate, queryClient, setUser],
  )

  const login = useCallback(
    async (values: LoginValues) => {
      const signedIn = await authApi.login(values)
      dropAppData()
      setUser(signedIn)
      return signedIn
    },
    [dropAppData, setUser],
  )

  const logout = useCallback(
    async ({ silent = false } = {}) => {
      try {
        await authApi.logout()
      } finally {
        dropAppData()
        setUser(null)
        navigate("/login", { replace: true })
        if (!silent) toast.success("You've been signed out")
      }
    },
    [dropAppData, navigate, setUser],
  )

  const value = useMemo<SessionContextValue>(() => {
    const current = user ?? null
    const status: SessionStatus = isPending ? "loading" : current ? "authenticated" : "anonymous"
    const hasRole = (...roles: Role[]) => Boolean(current && roles.includes(current.role))
    return {
      user: current,
      status,
      isAuthenticated: status === "authenticated",
      hasRole,
      isManager: hasRole("ADMIN", "MANAGER"),
      login,
      logout,
      setUser,
    }
  }, [user, isPending, login, logout, setUser])

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used inside <SessionProvider>")
  return context
}
