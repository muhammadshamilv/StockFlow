import { formatDistanceToNowStrict, format as formatDate } from "date-fns"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
})
const num = new Intl.NumberFormat("en-IN")

export const formatCurrency = (value: number | string, { compact = false } = {}) =>
  (compact ? inrCompact : inr).format(Number(value) || 0)

export const formatNumber = (value: number | string) => num.format(Number(value) || 0)

export const formatPercent = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined) return "—"
  // A near-empty comparison period produces meaningless numbers like +26508%
  if (Math.abs(value) >= 1000) return value > 0 ? ">+999%" : "<-999%"
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`
}

export const formatDateTime = (iso: string) => formatDate(new Date(iso), "dd MMM yyyy, hh:mm a")
export const formatDay = (iso: string) => formatDate(new Date(iso), "dd MMM yyyy")
export const timeAgo = (iso: string) => `${formatDistanceToNowStrict(new Date(iso))} ago`
