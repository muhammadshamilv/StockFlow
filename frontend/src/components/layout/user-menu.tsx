import { useSetAtom } from "jotai"
import { ChevronsUpDownIcon, CommandIcon, KeyRoundIcon, LogOutIcon, UserIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "@/features/auth/schemas"
import { useSession } from "@/features/auth/session-provider"
import { modKey } from "@/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { commandMenuOpenAtom, logoutDialogOpenAtom } from "@/store/ui.atoms"

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  return (
    <Avatar className={className}>
      {user.avatar && <AvatarImage src={user.avatar} alt={user.full_name} />}
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  )
}

const roleTone = { ADMIN: "default", MANAGER: "info", STAFF: "secondary" } as const

function UserMenuContent({
  align = "end",
  side,
}: {
  align?: "start" | "end"
  side?: "top" | "bottom" | "right"
}) {
  const { user } = useSession()
  const navigate = useNavigate()
  const openLogout = useSetAtom(logoutDialogOpenAtom)
  const openCommand = useSetAtom(commandMenuOpenAtom)
  if (!user) return null

  return (
    <DropdownMenuContent align={align} side={side} className="w-64">
      <DropdownMenuLabel className="text-foreground flex items-center gap-3 py-2">
        <UserAvatar user={user} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.full_name}</p>
          <p className="text-muted-foreground truncate text-xs font-normal">{user.email}</p>
          <Badge variant={roleTone[user.role]} className="mt-1.5">
            {user.role_display}
          </Badge>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => navigate("/profile")}>
          <UserIcon /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/profile?tab=security")}>
          <KeyRoundIcon /> Password & security
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openCommand(true)}>
          <CommandIcon /> Command menu
          <DropdownMenuShortcut>{modKey}K</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => openLogout(true)}>
        <LogOutIcon /> Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/** Avatar button for the top bar */
export function UserMenu() {
  const { user } = useSession()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-primary/30 rounded-full outline-none focus-visible:ring-4"
        aria-label="Account menu"
      >
        <UserAvatar user={user} className="size-9" />
      </DropdownMenuTrigger>
      <UserMenuContent />
    </DropdownMenu>
  )
}

/** User card at the bottom of the sidebar */
export function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useSession()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl p-2 text-left transition outline-none focus-visible:ring-2",
          collapsed && "justify-center",
        )}
      >
        <UserAvatar user={user} className="size-9" />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.role_display}</p>
            </div>
            <ChevronsUpDownIcon className="text-muted-foreground size-4" />
          </>
        )}
      </DropdownMenuTrigger>
      <UserMenuContent side={collapsed ? "right" : "top"} align="start" />
    </DropdownMenu>
  )
}
