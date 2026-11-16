import { useEffect } from "react"

import { env } from "@/lib/env"

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${env.VITE_APP_NAME}` : env.VITE_APP_NAME
  }, [title])
}
