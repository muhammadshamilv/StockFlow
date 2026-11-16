import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

type Defaults = Record<string, string>

/**
 * Filters, search, sort and page live in the URL (?search=…&page=2), so lists
 * are shareable, survive reloads and work with the back button.
 */
export function useUrlState<T extends Defaults>(defaults: T) {
  const [params, setParams] = useSearchParams()

  const state = useMemo(() => {
    const out = { ...defaults }
    for (const key of Object.keys(defaults)) {
      const value = params.get(key)
      if (value !== null) (out as Defaults)[key] = value
    }
    return out
  }, [params, defaults])

  const update = useCallback(
    (patch: Partial<T>, { resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "" || value === defaults[key]) next.delete(key)
            else next.set(key, String(value))
          }
          if (resetPage && !("page" in patch)) next.delete("page")
          return next
        },
        { replace: true },
      )
    },
    [setParams, defaults],
  )

  return [state, update] as const
}

/** Drop empty values before sending params to the API. */
export const cleanParams = (params: Record<string, string | number | boolean | undefined>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined))
