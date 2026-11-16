import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { invalidateStock } from "@/features/catalog/hooks"
import { queryKeys } from "@/lib/query-keys"

import { salesApi, type CustomerInput, type SaleParams } from "./api"

/* ------------------------------ Sales ------------------------------ */
export const useSales = (params: SaleParams) =>
  useQuery({
    queryKey: queryKeys.sales.list(params),
    queryFn: () => salesApi.sales(params),
    placeholderData: keepPreviousData,
  })

export const useSalesSummary = (params: SaleParams) =>
  useQuery({
    queryKey: queryKeys.sales.summary(params),
    queryFn: () => salesApi.summary(params),
    placeholderData: keepPreviousData,
  })

export const useSale = (id: number) =>
  useQuery({ queryKey: queryKeys.sales.detail(id), queryFn: () => salesApi.sale(id) })

export function useCreateSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.sales.all })
      void client.invalidateQueries({ queryKey: queryKeys.customers.all })
      return invalidateStock(client)
    },
    meta: { errorMessage: false },
  })
}

export function useCancelSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => salesApi.cancelSale(id, reason),
    onSuccess: (sale) => {
      client.setQueryData(queryKeys.sales.detail(sale.id), sale)
      void client.invalidateQueries({ queryKey: queryKeys.sales.all })
      void client.invalidateQueries({ queryKey: queryKeys.customers.all })
      return invalidateStock(client)
    },
    meta: { successMessage: "Sale cancelled – stock returned" },
  })
}

/* ------------------------------ Customers ------------------------------ */
export const useCustomers = (params: { page?: number; search?: string; ordering?: string }) =>
  useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => salesApi.customers(params),
    placeholderData: keepPreviousData,
  })

export const useCustomerSales = (id: number | null) =>
  useQuery({
    queryKey: queryKeys.customers.sales(id ?? 0),
    queryFn: () => salesApi.customerSales(id!),
    enabled: id !== null,
  })

export function useSaveCustomer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CustomerInput }) =>
      id ? salesApi.updateCustomer(id, input) : salesApi.createCustomer(input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.customers.all }),
    meta: { errorMessage: false },
  })
}

export function useDeleteCustomer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: salesApi.deleteCustomer,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.customers.all }),
    meta: { successMessage: "Customer deleted" },
  })
}
