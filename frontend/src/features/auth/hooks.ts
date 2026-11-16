import { useMutation, useQuery } from "@tanstack/react-query"

import { useDebouncedValue } from "@/hooks/use-debounce"
import { queryKeys } from "@/lib/query-keys"

import { authApi } from "./api"
import { useSession } from "./session-provider"

export type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "error"

/**
 * Live "is this username/email free?" check.
 * Debounced, cached per value, and only runs when the value is locally valid.
 */
export function useAvailability(field: "username" | "email", value: string, locallyValid: boolean) {
  const debounced = useDebouncedValue(value.trim(), 450)
  const settled = debounced === value.trim()
  const enabled = locallyValid && settled && debounced.length > 0

  const query = useQuery({
    queryKey: queryKeys.auth.availability(field, debounced.toLowerCase()),
    queryFn: () => authApi.availability(field, debounced),
    enabled,
    staleTime: 60_000,
    retry: false,
    meta: { errorMessage: false },
  })

  let status: AvailabilityStatus = "idle"
  if (locallyValid && value.trim()) {
    if (!settled || query.isFetching) status = "checking"
    else if (query.isError) status = "error"
    else if (query.data) status = query.data.available ? "available" : "taken"
  }
  return { status, message: query.data?.message }
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register, meta: { errorMessage: false } })
}

export function useLogin() {
  const { login } = useSession()
  return useMutation({ mutationFn: login, meta: { errorMessage: false } })
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: authApi.requestPasswordReset, meta: { errorMessage: false } })
}

export function useConfirmPasswordReset() {
  return useMutation({ mutationFn: authApi.confirmPasswordReset, meta: { errorMessage: false } })
}

export function useChangePassword() {
  const { setUser } = useSession()
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: setUser,
    meta: { errorMessage: false, successMessage: "Password updated. Other devices were signed out." },
  })
}

export function useUpdateProfile() {
  const { setUser } = useSession()
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: setUser,
    meta: { errorMessage: false, successMessage: "Profile saved" },
  })
}
