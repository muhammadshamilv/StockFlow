import { useState } from "react"
import {
  MoreHorizontalIcon,
  PencilIcon,
  ReceiptTextIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { DataTable, type Column } from "@/components/data/data-table"
import { Pagination } from "@/components/data/pagination"
import { SearchInput } from "@/components/data/search-input"
import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { SkeletonRows } from "@/components/feedback/skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { SaleStatusBadge } from "@/components/shared/status-badges"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { cleanParams, useUrlState } from "@/hooks/use-url-state"
import { formatCurrency, formatDateTime, formatNumber, timeAgo } from "@/lib/format"
import { initials } from "@/lib/utils"

import type { Customer } from "../api"
import { CustomerFormDialog } from "../components/customer-form-dialog"
import { useCustomers, useCustomerSales, useDeleteCustomer } from "../hooks"

const DEFAULTS = { search: "", ordering: "-total_spent", page: "1" }
const PAGE_SIZE = 20

function CustomerSheet({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const history = useCustomerSales(customer?.id ?? null)
  return (
    <Sheet open={Boolean(customer)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="bg-popover p-0 sm:max-w-md">
        {customer && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback>{initials(customer.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{customer.name}</SheetTitle>
                  <SheetDescription>
                    {[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Orders", formatNumber(customer.orders_count)],
                  ["Spent", formatCurrency(customer.total_spent, { compact: true })],
                  ["Last visit", customer.last_purchase_at ? timeAgo(customer.last_purchase_at) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-2.5">
                    <p className="text-muted-foreground text-[11px]">{label}</p>
                    <p className="tabular mt-0.5 truncate text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <p className="text-muted-foreground px-5 pt-4 pb-2 text-xs font-medium tracking-wide uppercase">
                Purchase history
              </p>
              {history.isPending ? (
                <SkeletonRows rows={5} className="px-5" />
              ) : !history.data?.results.length ? (
                <EmptyState icon={ReceiptTextIcon} title="No purchases yet" className="py-8" />
              ) : (
                <ul className="divide-y">
                  {history.data.results.map((sale) => (
                    <li key={sale.id}>
                      <Link
                        to={`/sales/${sale.id}`}
                        className="hover:bg-accent/50 flex items-center gap-3 px-5 py-3 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm">{sale.invoice_number}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDateTime(sale.created_at)} · {sale.items_count} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular text-sm font-semibold">{formatCurrency(sale.total)}</p>
                          {sale.status === "CANCELLED" && <SaleStatusBadge status={sale.status} />}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default function CustomersPage() {
  useDocumentTitle("Customers")
  const { isManager } = useSession()
  const [state, update] = useUrlState(DEFAULTS)
  const customers = useCustomers(
    cleanParams({ search: state.search, ordering: state.ordering, page: Number(state.page) }),
  )
  const remove = useDeleteCustomer()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)

  const actions = (c: Customer) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() => {
            setEditing(c)
            setFormOpen(true)
          }}
        >
          <PencilIcon /> Edit
        </DropdownMenuItem>
        {isManager && (
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      sortKey: "name",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{c.name}</p>
            <p className="text-muted-foreground truncate text-xs">{c.phone || c.email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      sortKey: "orders_count",
      align: "right",
      hideBelow: "sm",
      cell: (c) => <span className="tabular">{c.orders_count}</span>,
    },
    {
      key: "spent",
      header: "Total spent",
      sortKey: "total_spent",
      align: "right",
      cell: (c) => <span className="tabular font-semibold">{formatCurrency(c.total_spent)}</span>,
    },
    {
      key: "last",
      header: "Last purchase",
      sortKey: "last_purchase_at",
      hideBelow: "lg",
      cell: (c) => (
        <span className="text-muted-foreground">
          {c.last_purchase_at ? timeAgo(c.last_purchase_at) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      className: "w-12",
      cell: actions,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Repeat buyers, their lifetime value and purchase history."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <UserPlusIcon /> Add customer
          </Button>
        }
      />
      <SearchInput
        value={state.search}
        onChange={(search) => update({ search })}
        placeholder="Name, phone or email…"
        loading={customers.isFetching}
      />

      {customers.isError ? (
        <ErrorState
          error={customers.error}
          onRetry={customers.refetch}
          className="bg-card rounded-2xl border"
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={customers.data?.results}
            rowKey={(c) => c.id}
            loading={customers.isPending}
            ordering={state.ordering}
            onOrderingChange={(ordering) => update({ ordering: ordering || "-total_spent" })}
            onRowClick={setViewing}
            empty={
              <EmptyState
                icon={UsersIcon}
                title={state.search ? "No matching customers" : "No customers yet"}
              />
            }
            renderCard={(c) => (
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.orders_count} orders ·{" "}
                    {c.last_purchase_at ? timeAgo(c.last_purchase_at) : "no purchases"}
                  </p>
                </div>
                <span className="tabular font-semibold">
                  {formatCurrency(c.total_spent, { compact: true })}
                </span>
              </div>
            )}
          />
          {customers.data && (
            <Pagination
              page={customers.data.page}
              totalPages={customers.data.total_pages}
              count={customers.data.count}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => update({ page: String(page) }, { resetPage: false })}
              label="customers"
            />
          )}
        </>
      )}

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editing} />
      <CustomerSheet customer={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="destructive"
        title={`Delete ${deleting?.name}?`}
        description="Their past invoices are kept and shown as walk-in sales."
        confirmLabel="Delete customer"
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await remove.mutateAsync(deleting.id)
          } finally {
            setDeleting(null)
          }
        }}
      />
    </div>
  )
}
