import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "./errors"

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError
    mutationMeta: { successMessage?: string; errorMessage?: string | false }
    queryMeta: { errorMessage?: string | false }
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Background refetch failures for data already on screen → toast
      if (query.meta?.errorMessage === false || query.state.data === undefined) return
      toast.error(query.meta?.errorMessage ?? error.message)
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _ctx, mutation) => {
      if (mutation.meta?.successMessage) toast.success(mutation.meta.successMessage)
    },
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.errorMessage === false) return
      toast.error(mutation.meta?.errorMessage ?? error.message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})
