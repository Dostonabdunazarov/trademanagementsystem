import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../products'

export interface CreateProductDto {
  name: string
  sku?: string
  unit: string
  priceSell: number
  priceBuy: number
  currencyId: string
  groupId?: string | null
  isActive: boolean
}

export interface CreateProductGroupDto {
  name: string
  parentId?: string | null
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductDto) => productsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateProductDto }) =>
      productsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useCreateProductGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductGroupDto) => productsApi.createGroup(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-groups'] }),
  })
}
