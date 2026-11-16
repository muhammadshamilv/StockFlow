import { useEffect, useState } from "react"
import { useNavigation } from "react-router-dom"

/** Slim glowing bar at the very top while a route (lazy chunk) is loading. */
export function RouteProgress() {
  const navigation = useNavigation()
  const active = navigation.state !== "idle"
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!active) {
      setWidth((w) => (w ? 100 : 0))
      const reset = setTimeout(() => setWidth(0), 300)
      return () => clearTimeout(reset)
    }
    setWidth(15)
    const timer = setInterval(() => setWidth((w) => Math.min(90, w + (90 - w) * 0.12)), 180)
    return () => clearInterval(timer)
  }, [active])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5" aria-hidden>
      <div
        className="bg-brand-gradient h-full shadow-[0_0_10px_var(--primary)] transition-[width,opacity] duration-300"
        style={{ width: `${width}%`, opacity: width === 0 || width === 100 ? 0 : 1 }}
      />
    </div>
  )
}
