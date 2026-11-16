import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { queryKeys, STOCK_DEPENDENT_KEYS } from "@/lib/query-keys"

import { catalogApi, type CategoryInput, type ProductInput, type ProductListParams } from "./api"

export const invalidateStock = (client: QueryClient) =>
  Promise.all(STOCK_DEPENDENT_KEYS.map((queryKey) => client.invalidateQueries({ queryKey })))

/* ------------------------------ Categories ------------------------------ */
export const useCategories = (search = "") =>
  useQuery({
    queryKey: queryKeys.categories.list({ search }),
    queryFn: () => catalogApi.categories({ search }),
    placeholderData: keepPreviousData,
  })

export const useCategoryOptions = () =>
  useQuery({
    queryKey: queryKeys.categories.options,
    queryFn: catalogApi.categoryOptions,
    staleTime: 5 * 60_000,
  })

export function useSaveCategory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CategoryInput }) =>
      id ? catalogApi.updateCategory(id, input) : catalogApi.createCategory(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.categories.all })
      void client.invalidateQueries({ queryKey: queryKeys.products.all })
    },
    meta: { errorMessage: false },
  })
}

export function useDeleteCategory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.deleteCategory,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.categories.all }),
    meta: { successMessage: "Category deleted" },
  })
}

/* ------------------------------ Products ------------------------------ */
export const useProducts = (params: ProductListParams) =>
  useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => catalogApi.products(params),
    placeholderData: keepPreviousData,
  })

export const useProduct = (id: number) =>
  useQuery({ queryKey: queryKeys.products.detail(id), queryFn: () => catalogApi.product(id) })

export const useProductSummary = () =>
  useQuery({ queryKey: queryKeys.products.summary, queryFn: catalogApi.productSummary })

export function useSaveProduct() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Partial<ProductInput> }) =>
      id ? catalogApi.updateProduct(id, input) : catalogApi.createProduct(input as ProductInput),
    onSuccess: () => invalidateStock(client),
    meta: { errorMessage: false },
  })
}

export function useAdjustStock() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, counted_quantity, note }: { id: number; counted_quantity: number; note: string }) =>
      catalogApi.adjustStock(id, { counted_quantity, note }),
    onSuccess: () => invalidateStock(client),
    meta: { errorMessage: false, successMessage: "Stock adjusted" },
  })
}

export function useDeleteProduct() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.deleteProduct,
    onSuccess: () => invalidateStock(client),
    meta: { successMessage: "Product deleted" },
  })
}
