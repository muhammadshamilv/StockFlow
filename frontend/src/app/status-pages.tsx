import { ArrowLeftIcon, CompassIcon, RefreshCwIcon, ShieldOffIcon } from "lucide-react"
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom"

import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"

function StatusLayout({
  code,
  title,
  description,
  icon: Icon,
  actions,
  fullscreen = false,
}: {
  code: string
  title: string
  description: string
  icon: typeof CompassIcon
  actions?: React.ReactNode
  fullscreen?: boolean
}) {
  return (
    <div
      className={
        fullscreen
          ? "bg-dot-grid grid min-h-dvh place-items-center p-6"
          : "grid min-h-[60vh] place-items-center"
      }
    >
      <div className="flex max-w-md flex-col items-center text-center">
        {fullscreen && <Logo className="mb-10" />}
        <div className="relative mb-6">
          <span className="bg-primary/25 absolute inset-0 rounded-3xl blur-2xl" />
          <div className="bg-card text-primary relative grid size-16 place-items-center rounded-3xl border">
            <Icon className="size-7" />
          </div>
        </div>
        <p className="text-primary font-mono text-sm">{code}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  )
}

export function NotFoundPage({ fullscreen = false }: { fullscreen?: boolean }) {
  useDocumentTitle("Page not found")
  return (
    <StatusLayout
      fullscreen={fullscreen}
      code="404"
      title="This page wandered off"
      description="The page you're looking for doesn't exist or was moved."
      icon={CompassIcon}
      actions={
        <Button asChild>
          <Link to="/dashboard">
            <ArrowLeftIcon /> Back to dashboard
          </Link>
        </Button>
      }
    />
  )
}

export function ForbiddenPage() {
  useDocumentTitle("Access denied")
  return (
    <StatusLayout
      code="403"
      title="You don't have access"
      description="Ask an administrator to upgrade your role if you need this page."
      icon={ShieldOffIcon}
      actions={
        <Button asChild variant="outline">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      }
    />
  )
}

/** errorElement for the router: chunk-load failures, render crashes, 404 responses. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage fullscreen />
  const chunkFailed =
    error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message)
  return (
    <StatusLayout
      fullscreen
      code={chunkFailed ? "UPDATE" : "ERROR"}
      title={chunkFailed ? "A new version is available" : "Something broke on this page"}
      description={
        chunkFailed
          ? "StockFlow was updated while you were using it. Reload to get the latest version."
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred."
      }
      icon={RefreshCwIcon}
      actions={
        <>
          <Button onClick={() => window.location.reload()}>
            <RefreshCwIcon /> Reload
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </>
      }
    />
  )
}
