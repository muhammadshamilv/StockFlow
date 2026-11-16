import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleSlashIcon,
  RotateCcwIcon,
  ScaleIcon,
  ShoppingBagIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"

/* Status colours always ship with an icon + label – never colour alone. */

export function StockStatusBadge({ status }: { status: "in_stock" | "low_stock" | "out_of_stock" }) {
  if (status === "in_stock")
    return (
      <Badge variant="success">
        <CheckCircle2Icon /> In stock
      </Badge>
    )
  if (status === "low_stock")
    return (
      <Badge variant="warning">
        <TriangleAlertIcon /> Low stock
      </Badge>
    )
  return (
    <Badge variant="destructive">
      <CircleSlashIcon /> Out of stock
    </Badge>
  )
}

export function SaleStatusBadge({ status }: { status: "COMPLETED" | "CANCELLED" }) {
  return status === "COMPLETED" ? (
    <Badge variant="success">
      <CheckCircle2Icon /> Completed
    </Badge>
  ) : (
    <Badge variant="destructive">
      <XCircleIcon /> Cancelled
    </Badge>
  )
}

const movementMeta = {
  IN: { label: "Stock in", icon: ArrowDownLeftIcon, variant: "success" },
  OUT: { label: "Stock out", icon: ArrowUpRightIcon, variant: "warning" },
  SALE: { label: "Sale", icon: ShoppingBagIcon, variant: "default" },
  RETURN: { label: "Return", icon: RotateCcwIcon, variant: "info" },
  ADJUSTMENT: { label: "Adjustment", icon: ScaleIcon, variant: "secondary" },
} as const

export function MovementTypeBadge({ type }: { type: keyof typeof movementMeta }) {
  const meta = movementMeta[type]
  return (
    <Badge variant={meta.variant}>
      <meta.icon /> {meta.label}
    </Badge>
  )
}
