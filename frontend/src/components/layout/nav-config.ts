import {
  ArrowLeftRightIcon,
  BellIcon,
  BoxesIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react"

import type { Role } from "@/features/auth/schemas"

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  roles?: Role[]
  keywords?: string[]
}

export type NavGroup = { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboardIcon,
        keywords: ["home", "kpi", "analytics"],
      },
      { label: "Notifications", to: "/notifications", icon: BellIcon, keywords: ["alerts"] },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "New sale",
        to: "/sales/new",
        icon: ShoppingCartIcon,
        keywords: ["pos", "checkout", "invoice", "bill"],
      },
      { label: "Sales", to: "/sales", icon: ReceiptTextIcon, keywords: ["orders", "invoices", "history"] },
      { label: "Customers", to: "/customers", icon: UsersIcon, keywords: ["clients", "buyers"] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products", to: "/products", icon: BoxesIcon, keywords: ["items", "sku", "catalog"] },
      { label: "Categories", to: "/categories", icon: FolderTreeIcon },
      {
        label: "Stock movements",
        to: "/stock",
        icon: ArrowLeftRightIcon,
        keywords: ["ledger", "receive", "stock in", "out"],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Team",
        to: "/team",
        icon: UserCogIcon,
        roles: ["ADMIN"],
        keywords: ["users", "roles", "staff"],
      },
    ],
  },
]

export const filterNav = (groups: NavGroup[], can: (...roles: Role[]) => boolean) =>
  groups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || can(...item.roles)) }))
    .filter((group) => group.items.length > 0)
