import { useState } from "react"
import { PencilIcon, ShieldCheckIcon, UserCheckIcon, UserPlusIcon, UsersIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/data/data-table"
import { SearchInput } from "@/components/data/search-input"
import { StatCard } from "@/components/data/stat-card"
import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { UserAvatar } from "@/components/layout/user-menu"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { User } from "@/features/auth/schemas"
import { useSession } from "@/features/auth/session-provider"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { timeAgo } from "@/lib/format"

import { MemberFormDialog } from "../components/member-form-dialog"
import { useTeam, useTeamStats } from "../hooks"

const roleTone = { ADMIN: "default", MANAGER: "info", STAFF: "secondary" } as const

export default function TeamPage() {
  useDocumentTitle("Team")
  const { user: me } = useSession()
  const [search, setSearch] = useState("")
  const team = useTeam({ search })
  const stats = useTeamStats()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const edit = (u: User | null) => {
    setEditing(u)
    setFormOpen(true)
  }

  const columns: Column<User>[] = [
    {
      key: "member",
      header: "Member",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <UserAvatar user={u} className="size-9" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {u.full_name}{" "}
              {u.id === me?.id && <span className="text-muted-foreground text-xs font-normal">(you)</span>}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              @{u.username} · {u.email}
            </p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (u) => <Badge variant={roleTone[u.role]}>{u.role_display}</Badge> },
    {
      key: "title",
      header: "Job title",
      hideBelow: "lg",
      cell: (u) => <span className="text-muted-foreground">{u.job_title || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      hideBelow: "sm",
      cell: (u) =>
        u.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Deactivated</Badge>
        ),
    },
    {
      key: "last",
      header: "Last sign-in",
      hideBelow: "md",
      cell: (u) => (
        <span className="text-muted-foreground">{u.last_login ? timeAgo(u.last_login) : "Never"}</span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Edit</span>,
      align: "right",
      className: "w-12",
      cell: (u) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => (e.stopPropagation(), edit(u))}
          aria-label={`Edit ${u.full_name}`}
        >
          <PencilIcon />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team"
        description="Who can sign in, and what each role is allowed to do."
        actions={
          <Button onClick={() => edit(null)}>
            <UserPlusIcon /> Add member
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard loading={stats.isPending} label="Members" icon={UsersIcon} value={stats.data?.total} />
        <StatCard loading={stats.isPending} label="Active" icon={UserCheckIcon} value={stats.data?.active} />
        <StatCard
          loading={stats.isPending}
          label="Admins & managers"
          icon={ShieldCheckIcon}
          value={stats.data && stats.data.admins + stats.data.managers}
        />
        <StatCard loading={stats.isPending} label="Staff" icon={UsersIcon} value={stats.data?.staff} />
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, username or email…"
        loading={team.isFetching}
      />
      {team.isError ? (
        <ErrorState error={team.error} onRetry={team.refetch} className="bg-card rounded-2xl border" />
      ) : (
        <DataTable
          columns={columns}
          rows={team.data?.results}
          rowKey={(u) => u.id}
          loading={team.isPending}
          onRowClick={edit}
          empty={<EmptyState icon={UsersIcon} title="No members found" />}
          renderCard={(u) => (
            <div className="flex items-center gap-3">
              <UserAvatar user={u} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.full_name}</p>
                <p className="text-muted-foreground truncate text-xs">@{u.username}</p>
              </div>
              <Badge variant={u.is_active ? roleTone[u.role] : "secondary"}>
                {u.is_active ? u.role_display : "Deactivated"}
              </Badge>
            </div>
          )}
        />
      )}
      <MemberFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} />
    </div>
  )
}
