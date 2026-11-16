import { useCallback, useState, type KeyboardEvent } from "react"

/** Tracks Caps Lock from key events on a specific input. */
export function useCapsLock() {
  const [on, setOn] = useState(false)
  const handleKey = useCallback((event: KeyboardEvent) => {
    if (typeof event.getModifierState === "function") setOn(event.getModifierState("CapsLock"))
  }, [])
  const reset = useCallback(() => setOn(false), [])
  return { on, handleKey, reset }
}
