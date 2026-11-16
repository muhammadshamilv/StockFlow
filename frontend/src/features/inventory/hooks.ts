import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { invalidateStock } from "@/features/catalog/hooks"
import { queryKeys } from "@/lib/query-keys"

import { inventoryApi, type MovementParams } from "./api"

/** Infinite ledger – powers infinite scroll + pull-to-refresh. */
export function useMovementsFeed(params: Omit<MovementParams, "page">) {
  return useInfiniteQuery({
    queryKey: queryKeys.movements.list(params),
    queryFn: ({ pageParam }) => inventoryApi.movements({ ...params, page: pageParam, page_size: 25 }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.next ?? undefined,
    placeholderData: keepPreviousData,
  })
}

export function useCreateMovement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.createMovement,
    onSuccess: () => invalidateStock(client),
    meta: { errorMessage: false },
  })
}
