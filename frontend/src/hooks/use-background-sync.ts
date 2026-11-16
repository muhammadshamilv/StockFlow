import { useIsFetching } from "@tanstack/react-query"

/** True while any query is fetching in the background (drives "syncing" indicators). */
export function useBackgroundSync() {
  return useIsFetching() > 0
}
