import { useAtom } from "jotai"
import { ChevronsLeftIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { sidebarCollapsedAtom } from "@/store/ui.atoms"

import { SidebarNav } from "./sidebar-nav"
import { UserCard } from "./user-menu"

/** Desktop sidebar (lg+). Collapses to an icon rail; state persisted via Jotai. */
export function Sidebar() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom)

  return (
    <aside
      className={cn(
        "bg-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
        <Link to="/dashboard" aria-label="Dashboard">
          <Logo iconOnly={collapsed} size="sm" />
        </Link>
      </div>

      <div className="px-3 pb-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="gradient" size="icon" className="mx-auto flex">
                <Link to="/sales/new" aria-label="New sale">
                  <PlusIcon />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New sale</TooltipContent>
          </Tooltip>
        ) : (
          <Button asChild variant="gradient" className="w-full">
            <Link to="/sales/new">
              <PlusIcon /> New sale
            </Link>
          </Button>
        )}
      </div>

      <div className={cn("flex-1 scrollbar-thin overflow-y-auto py-4", collapsed ? "px-3" : "px-3")}>
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className="space-y-2 border-t p-3">
        <UserCard collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeftIcon className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  )
}
