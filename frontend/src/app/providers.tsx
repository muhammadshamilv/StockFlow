import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Provider as JotaiProvider } from "jotai"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/context/theme-provider"
import { queryClient } from "@/lib/query-client"

/** App-wide providers that don't need the router. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={250}>
            {children}
            <Toaster />
          </TooltipProvider>
          {import.meta.env.DEV && (
            // Hidden on phones so it never covers the bottom tab bar
            <div className="hidden md:block">
              <ReactQueryDevtools buttonPosition="bottom-left" />
            </div>
          )}
        </QueryClientProvider>
      </ThemeProvider>
    </JotaiProvider>
  )
}
