import { useSetAtom } from "jotai"
import { MenuIcon, SearchIcon } from "lucide-react"
import { useMatches } from "react-router-dom"

import { LiveDot } from "@/components/feedback/pulse-dots"
import { Spinner } from "@/components/feedback/spinner"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useBackgroundSync } from "@/hooks/use-background-sync"
import { modKey } from "@/hooks/use-hotkey"
import { commandMenuOpenAtom, mobileNavOpenAtom } from "@/store/ui.atoms"

import { NotificationBell } from "./notification-bell"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

type RouteHandle = { title?: string }

function SyncIndicator() {
  const syncing = useBackgroundSync()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground hidden h-8 items-center gap-2 rounded-full border px-3 text-xs sm:inline-flex">
          {syncing ? <Spinner size="xs" className="text-primary" /> : <LiveDot />}
          {syncing ? "Syncing" : "Live"}
        </span>
      </TooltipTrigger>
      <TooltipContent>{syncing ? "Fetching latest data…" : "Data is up to date"}</TooltipContent>
    </Tooltip>
  )
}

export function Topbar() {
  const openCommand = useSetAtom(commandMenuOpenAtom)
  const openMobileNav = useSetAtom(mobileNavOpenAtom)
  const matches = useMatches()
  const title = [...matches]
    .reverse()
    .map((m) => (m.handle as RouteHandle | undefined)?.title)
    .find(Boolean)

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => openMobileNav(true)}
        aria-label="Open menu"
      >
        <MenuIcon />
      </Button>
      <span className="lg:hidden">
        <Logo iconOnly size="sm" />
      </span>
      <h2 className="hidden truncate text-sm font-semibold md:block lg:text-base">{title}</h2>

      <button
        type="button"
        onClick={() => openCommand(true)}
        className="bg-surface/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground ml-auto flex h-9 w-9 items-center gap-2.5 rounded-lg border text-sm transition sm:w-64 sm:px-3 md:mr-auto md:ml-6"
        aria-label="Search"
      >
        <SearchIcon className="mx-auto size-4 sm:mx-0" />
        <span className="hidden flex-1 text-left sm:inline">Search…</span>
        <Kbd className="hidden sm:inline-flex">{modKey}K</Kbd>
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <SyncIndicator />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
