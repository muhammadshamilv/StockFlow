import { useEffect, useRef } from "react"

/**
 * useHotkey("mod+k", handler) – `mod` is ⌘ on macOS, Ctrl elsewhere.
 * Ignored while typing in inputs unless `allowInInputs` is set.
 */
export function useHotkey(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  { allowInInputs = false } = {},
) {
  const saved = useRef(handler)
  useEffect(() => {
    saved.current = handler
  })

  useEffect(() => {
    const parts = combo.toLowerCase().split("+")
    const key = parts.at(-1)
    const needsMod = parts.includes("mod")
    const needsShift = parts.includes("shift")

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      if (typing && !allowInInputs && !needsMod) return
      if (needsMod !== (event.metaKey || event.ctrlKey)) return
      if (needsShift !== event.shiftKey) return
      if (event.key.toLowerCase() !== key) return
      event.preventDefault()
      saved.current(event)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [combo, allowInInputs])
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
export const modKey = isMac ? "⌘" : "Ctrl"
