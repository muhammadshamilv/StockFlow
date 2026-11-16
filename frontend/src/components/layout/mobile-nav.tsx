import { useAtom } from "jotai"
import { ArrowLeftRightIcon, BoxesIcon, LayoutDashboardIcon, PlusIcon, ReceiptTextIcon } from "lucide-react"
import { Link, NavLink } from "react-router-dom"

import { Logo } from "@/components/shared/logo"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { mobileNavOpenAtom } from "@/store/ui.atoms"

import { SidebarNav } from "./sidebar-nav"
import { UserCard } from "./user-menu"

const TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboardIcon },
  { to: "/products", label: "Products", icon: BoxesIcon },
  { to: "/stock", label: "Stock", icon: ArrowLeftRightIcon },
  { to: "/sales", label: "Sales", icon: ReceiptTextIcon },
]

/** Phone bottom tab bar with a floating "New sale" button in the middle. */
export function MobileTabBar() {
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)]
  const tab = (item: (typeof TABS)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/sales"}
      className={({ isActive }) =>
        cn(
          "text-muted-foreground flex flex-1 flex-col items-center gap-1 pt-2 text-[11px] font-medium transition-colors",
          isActive && "text-primary",
        )
      }
    >
      <item.icon className="size-5" />
      {item.label}
    </NavLink>
  )
  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden" aria-label="Primary">
      {left.map(tab)}
      <div className="flex flex-1 justify-center">
        <Link
          to="/sales/new"
          aria-label="New sale"
          className="bg-brand-gradient ring-background -mt-6 grid size-14 place-items-center rounded-2xl text-white shadow-[0_10px_30px_-6px_var(--primary)] ring-4 transition active:scale-95"
        >
          <PlusIcon className="size-6" />
        </Link>
      </div>
      {right.map(tab)}
    </nav>
  )
}

/** Slide-in full navigation for phones & tablets. */
export function MobileNavSheet() {
  const [open, setOpen] = useAtom(mobileNavOpenAtom)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[85%] max-w-[300px] p-0">
        <SheetHeader className="border-b">
          <SheetTitle>
            <Logo size="sm" />
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <div className="pb-safe border-t p-3">
          <UserCard />
        </div>
      </SheetContent>
    </Sheet>
  )
}
