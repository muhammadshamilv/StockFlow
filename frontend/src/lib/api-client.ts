import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { env } from "./env"
import { normalizeError } from "./errors"

/**
 * Cookie-based API client.
 *
 * - Auth lives in httpOnly cookies set by Django; JS never sees a token.
 * - Every unsafe request carries X-CSRFToken (read from the `csrftoken` cookie).
 * - On 401 the client refreshes the session ONCE (single-flight) and replays
 *   every request that failed meanwhile. If refresh fails, a global
 *   "session expired" event is emitted and the SessionProvider logs out.
 */
export const api = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  timeout: 20_000,
  headers: { Accept: "application/json" },
})

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean; _csrfRetried?: boolean }

const AUTH_PATHS = ["/auth/login/", "/auth/register/", "/auth/refresh/", "/auth/logout/", "/auth/csrf/"]
const isAuthPath = (url = "") => AUTH_PATHS.some((path) => url.includes(path))

let refreshPromise: Promise<void> | null = null

export function refreshSession(): Promise<void> {
  refreshPromise ??= api
    .post("/auth/refresh/")
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

export function ensureCsrfCookie(): Promise<unknown> {
  return api.get("/auth/csrf/")
}

/* ---------------- session-expired pub/sub (no React import here) ---------------- */
type Listener = () => void
const listeners = new Set<Listener>()
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const emitSessionExpired = () => listeners.forEach((listener) => listener())

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined
    const status = error.response?.status

    if (config && status === 403 && !config._csrfRetried) {
      const body = error.response?.data as { error?: { message?: string } } | undefined
      if (body?.error?.message?.startsWith("CSRF")) {
        config._csrfRetried = true
        await ensureCsrfCookie()
        return api(config)
      }
    }

    if (config && status === 401 && !config._retried && !isAuthPath(config.url)) {
      config._retried = true
      try {
        await refreshSession()
        return api(config)
      } catch (refreshError) {
        emitSessionExpired()
        return Promise.reject(normalizeError(refreshError))
      }
    }

    return Promise.reject(normalizeError(error))
  },
)
