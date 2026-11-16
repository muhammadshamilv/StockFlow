import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import { teamApi, type TeamMemberInput } from "./api"

export const useTeam = (params: { search?: string; role?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => teamApi.list(params),
    placeholderData: keepPreviousData,
  })

export const useTeamStats = () => useQuery({ queryKey: queryKeys.users.stats, queryFn: teamApi.stats })

export function useSaveMember() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Partial<TeamMemberInput> }) =>
      id ? teamApi.update(id, input) : teamApi.create(input as TeamMemberInput),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.users.all }),
    meta: { errorMessage: false },
  })
}
