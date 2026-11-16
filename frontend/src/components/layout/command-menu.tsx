import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useSetAtom } from "jotai"
import {
  CornerDownLeftIcon,
  LogOutIcon,
  MoonIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
  SunIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { Spinner } from "@/components/feedback/spinner"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { useTheme } from "@/context/theme-provider"
import { useSession } from "@/features/auth/session-provider"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { useHotkey } from "@/hooks/use-hotkey"
import { api } from "@/lib/api-client"
import { formatCurrency } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import { commandMenuOpenAtom, logoutDialogOpenAtom } from "@/store/ui.atoms"

import { filterNav, NAV_GROUPS } from "./nav-config"

const productHitSchema = z.array(
  z.object({
    id: z.number(),
    sku: z.string(),
    name: z.string(),
    selling_price: z.string(),
    quantity: z.number(),
  }),
)

/** ⌘K / Ctrl+K: jump anywhere, run actions, search products live. */
export function CommandMenu() {
  const [open, setOpen] = useAtom(commandMenuOpenAtom)
  const openLogout = useSetAtom(logoutDialogOpenAtom)
  const [search, setSearch] = useState("")
  const navigate = useNavigate()
  const { hasRole, isManager } = useSession()
  const { resolvedTheme, toggleTheme } = useTheme()
  const term = useDebouncedValue(search.trim(), 250)

  useHotkey("mod+k", () => setOpen((o) => !o))

  const products = useQuery({
    queryKey: queryKeys.products.search(term),
    queryFn: async () =>
      productHitSchema.parse((await api.get("/products/options/", { params: { search: term } })).data),
    enabled: open && term.length >= 2,
    staleTime: 30_000,
    meta: { errorMessage: false },
  })

  const groups = useMemo(() => filterNav(NAV_GROUPS, hasRole), [hasRole])

  const run = (fn: () => void) => {
    setOpen(false)
    setSearch("")
    fn()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showClose={false} className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <DialogDescription className="sr-only">Search pages, products and actions</DialogDescription>
        <Command loop>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search pages, products, actions…"
            trailing={products.isFetching ? <Spinner size="sm" className="text-primary" /> : <Kbd>Esc</Kbd>}
          />
          <CommandList>
            <CommandEmpty>No results for “{search}”.</CommandEmpty>

            {term.length >= 2 && products.data && products.data.length > 0 && (
              <CommandGroup heading="Products">
                {products.data.slice(0, 6).map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`product ${p.name} ${p.sku}`}
                    onSelect={() => run(() => navigate(`/products/${p.id}`))}
                  >
                    <PackageIcon />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">{p.sku}</span>
                    <span className="tabular w-20 text-right text-xs">{formatCurrency(p.selling_price)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Quick actions">
              <CommandItem value="new sale checkout pos" onSelect={() => run(() => navigate("/sales/new"))}>
                <ShoppingCartIcon /> New sale
              </CommandItem>
              {isManager && (
                <CommandItem
                  value="add product create"
                  onSelect={() => run(() => navigate("/products?new=1"))}
                >
                  <PlusIcon /> Add product
                </CommandItem>
              )}
              <CommandItem value="toggle theme dark light mode" onSelect={() => run(toggleTheme)}>
                {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
              </CommandItem>
            </CommandGroup>

            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.to}
                    value={`${item.label} ${(item.keywords ?? []).join(" ")}`}
                    onSelect={() => run(() => navigate(item.to))}
                  >
                    <item.icon /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem value="sign out logout" onSelect={() => run(() => openLogout(true))}>
                <LogOutIcon /> Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeftIcon className="size-3" />
              </Kbd>
              to select
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
