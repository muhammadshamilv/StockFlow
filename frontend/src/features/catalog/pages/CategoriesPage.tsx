import { useState } from "react"
import { FolderPlusIcon, FolderTreeIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { Link } from "react-router-dom"

import { SearchInput } from "@/components/data/search-input"
import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { Skeleton } from "@/components/feedback/skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatCurrency, formatNumber } from "@/lib/format"

import type { Category } from "../api"
import { CategoryFormDialog } from "../components/category-form-dialog"
import { useCategories, useDeleteCategory } from "../hooks"

export default function CategoriesPage() {
  useDocumentTitle("Categories")
  const { isManager } = useSession()
  const [search, setSearch] = useState("")
  const categories = useCategories(search)
  const remove = useDeleteCategory()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const rows = categories.data?.results ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Group products to filter faster and see where your stock value sits."
        actions={
          isManager && (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <FolderPlusIcon /> New category
            </Button>
          )
        }
      />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search categories…"
        loading={categories.isFetching}
      />

      {categories.isError ? (
        <ErrorState
          error={categories.error}
          onRetry={categories.refetch}
          className="bg-card rounded-2xl border"
        />
      ) : categories.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderTreeIcon}
          title={search ? "No matching categories" : "No categories yet"}
          description={search ? undefined : "Create your first category, then add products to it."}
          className="bg-card rounded-2xl border"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="group bg-card hover:border-primary/30 relative overflow-hidden rounded-2xl border p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.color }} />
              <div className="flex items-start gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: `${c.color}22`, color: c.color }}
                >
                  <FolderTreeIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/products?category=${c.id}`}
                    className="hover:text-primary font-semibold after:absolute after:inset-0"
                  >
                    {c.name}
                  </Link>
                  <p className="text-muted-foreground line-clamp-1 text-sm">
                    {c.description || "No description"}
                  </p>
                </div>
                {isManager && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="relative z-10"
                        aria-label={`Actions for ${c.name}`}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(c)
                          setFormOpen(true)
                        }}
                      >
                        <PencilIcon /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                        <Trash2Icon /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Products</dt>
                  <dd className="tabular font-semibold">{formatNumber(c.product_count)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Units</dt>
                  <dd className="tabular font-semibold">{formatNumber(c.stock_units)}</dd>
                </div>
                {isManager && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Value</dt>
                    <dd className="tabular font-semibold">
                      {formatCurrency(c.stock_value, { compact: true })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="destructive"
        title={`Delete “${deleting?.name}”?`}
        description={
          deleting?.product_count
            ? `This category still has ${deleting.product_count} products. Move or archive them first.`
            : "This can't be undone."
        }
        confirmLabel="Delete"
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
