import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import type { DashboardRange } from "@/store/preferences.atoms"

import { dashboardApi } from "./api"

export function useDashboard(range: DashboardRange) {
  return useQuery({
    queryKey: queryKeys.dashboard(range),
    queryFn: () => dashboardApi.get(range),
    placeholderData: keepPreviousData, // keep the old chart while the new range loads
    refetchInterval: 60_000,
  })
}
