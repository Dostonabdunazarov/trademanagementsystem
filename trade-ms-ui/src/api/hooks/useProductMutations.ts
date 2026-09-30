import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { productsApi } from '../products'

/** CreateProductRequest на бэкенде (UpdateProductRequest — то же плюс isActive). */
export interface CreateProductDto {
  groupId: string | null
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  priceSell: number
  priceBuy: number
  currencyId: string
}

export interface UpdateProductDto extends CreateProductDto {
  isActive: boolean
}

export interface CreateProductGroupDto {
  name: string
  parentId?: string | null
}

function invalidate(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['products'] })
  // Названия и цены товаров есть в отчётах по складу и продажам.
  qc.invalidateQueries({ queryKey: ['reports'] })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductDto) => productsApi.create(data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsApi.update(id, data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => invalidate(qc),
  })
}

export function useCreateProductGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductGroupDto) => productsApi.createGroup(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-groups'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
