import { atomWithStorage } from "jotai/utils"

export type DashboardRange = "7d" | "30d" | "90d" | "12m"

/** User preferences persisted in localStorage */
export const dashboardRangeAtom = atomWithStorage<DashboardRange>("sf-dashboard-range", "30d", undefined, {
  getOnInit: true,
})
export const tablePageSizeAtom = atomWithStorage<number>("sf-page-size", 20, undefined, { getOnInit: true })
export const compactNumbersAtom = atomWithStorage<boolean>("sf-compact-numbers", false, undefined, {
  getOnInit: true,
})
