import { NavLink } from "react-router-dom"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession } from "@/features/auth/session-provider"
import { cn } from "@/lib/utils"

import { filterNav, NAV_GROUPS } from "./nav-config"

/** Nav links shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { hasRole } = useSession()
  const groups = filterNav(NAV_GROUPS, hasRole)

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p
            className={cn(
              "text-muted-foreground/70 px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase transition-opacity",
              collapsed && "h-0 overflow-hidden opacity-0",
            )}
          >
            {group.label}
          </p>
          {group.items.map((item) => {
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/sales"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group text-muted-foreground hover:bg-accent/70 hover:text-foreground relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive &&
                      "bg-primary/10 text-foreground before:bg-primary before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-1 before:rounded-r-full before:shadow-[0_0_12px_var(--primary)]",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn("size-[18px] shrink-0 transition-colors", isActive && "text-primary")}
                    />
                    <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            )
          })}
        </div>
      ))}
    </nav>
  )
}
