import { CheckIcon, FileTextIcon, PlusIcon, ReceiptTextIcon } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router-dom"

import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Button } from "@/components/ui/button"
import { openPdf } from "@/lib/download"
import { formatCurrency } from "@/lib/format"

import type { SaleDetail } from "../api"

export function SaleSuccessDialog({ sale, onClose }: { sale: SaleDetail | null; onClose: () => void }) {
  if (!sale) return null
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Sale complete"
      className="sm:max-w-md"
    >
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative mb-4"
        >
          <span className="bg-success/40 absolute inset-0 rounded-full blur-xl" />
          <span className="bg-success relative grid size-16 place-items-center rounded-full text-white">
            <CheckIcon className="size-8" strokeWidth={3} />
          </span>
        </motion.div>
        <p className="tabular text-3xl font-semibold tracking-tight">{formatCurrency(sale.total)}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          <span className="font-mono">{sale.invoice_number}</span> · {sale.payment_method_display} ·{" "}
          {sale.customer_name}
        </p>
        {sale.change_due && Number(sale.change_due) > 0 && (
          <p className="bg-success/12 text-success mt-3 rounded-full px-3 py-1 text-sm font-medium">
            Return change: {formatCurrency(sale.change_due)}
          </p>
        )}
        <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => void openPdf(`/sales/${sale.id}/invoice/`)}>
            <FileTextIcon /> Invoice PDF
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/sales/${sale.id}`}>
              <ReceiptTextIcon /> View details
            </Link>
          </Button>
          <Button className="sm:col-span-2" onClick={onClose} autoFocus>
            <PlusIcon /> New sale
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
