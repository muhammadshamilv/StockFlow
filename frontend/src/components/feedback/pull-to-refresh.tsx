import { useRef, useState, type PointerEvent, type ReactNode } from "react"
import { ArrowDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { Spinner } from "./spinner"

type PullToRefreshProps = {
  onRefresh: () => Promise<unknown>
  children: ReactNode
  /** Pixels the user must pull before release triggers a refresh */
  threshold?: number
  disabled?: boolean
  /** "window" for page lists, "self" when this element is the scroll container */
  scrollContainer?: "window" | "self"
  /** Also allow mouse dragging (used by the UI-kit demo) */
  allowMouse?: boolean
  className?: string
}

/**
 * Native-feeling pull-to-refresh. Only engages when the list is scrolled to
 * the very top, with rubber-band resistance and a rotating arrow → spinner.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 72,
  disabled = false,
  scrollContainer = "window",
  allowMouse = false,
  className,
}: PullToRefreshProps) {
  const startY = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const atTop = (el: HTMLElement) => (scrollContainer === "self" ? el.scrollTop <= 0 : window.scrollY <= 0)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || refreshing) return
    if (e.pointerType === "mouse" && !allowMouse) return
    if (!atTop(e.currentTarget)) return
    startY.current = e.clientY
    setDragging(true)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return
    const delta = e.clientY - startY.current
    if (delta > 6 && !e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.setPointerCapture(e.pointerId)
    setPull(delta > 0 ? Math.min(threshold * 1.6, delta * 0.5) : 0)
  }

  const finish = async () => {
    if (startY.current === null) return
    startY.current = null
    setDragging(false)
    if (pull < threshold) return setPull(0)
    setRefreshing(true)
    setPull(threshold)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
      setPull(0)
    }
  }

  const progress = Math.min(1, pull / threshold)

  return (
    <div
      className={cn(
        "relative touch-pan-y overscroll-y-contain",
        scrollContainer === "self" && "overflow-y-auto",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div
        className="pointer-events-none sticky top-0 z-10 flex h-0 justify-center"
        style={{ opacity: pull > 4 || refreshing ? 1 : 0 }}
        aria-hidden={!refreshing}
      >
        <div
          className="bg-popover text-primary grid size-10 place-items-center rounded-full border shadow-lg transition-opacity"
          style={{ transform: `translateY(${Math.max(8, pull - 36)}px)` }}
        >
          {refreshing ? (
            <Spinner size="sm" label="Refreshing" />
          ) : (
            <ArrowDownIcon className="size-4" style={{ transform: `rotate(${progress * 180}deg)` }} />
          )}
        </div>
      </div>
      <div
        className={cn(!dragging && "transition-transform duration-300 ease-out", dragging && "select-none")}
        style={{ transform: pull ? `translateY(${pull}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  )
}
