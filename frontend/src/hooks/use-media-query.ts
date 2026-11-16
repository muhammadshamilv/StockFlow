import { useSyncExternalStore } from "react"

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Below Tailwind's `md` breakpoint (768px) */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)")
/** Tailwind `lg` and up (1024px) */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)")
