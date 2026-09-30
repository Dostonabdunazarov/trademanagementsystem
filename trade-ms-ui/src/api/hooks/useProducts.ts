import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../products'

/** ProductDto на бэкенде. */
export interface ProductDto {
  id: string
  companyId: string
  groupId: string | null
  groupName: string | null
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  priceSell: number
  priceBuy: number
  currencyId: string
  currencyCode: string
  isActive: boolean
}

export interface ProductsPage {
  items: ProductDto[]
  totalCount: number
  page: number
  pageSize: number
}

interface Params {
  search?: string
  groupId?: string | null
  page?: number
  /** Сервер ограничивает 1..200. */
  pageSize?: number
}

export function useProducts(params: Params = {}) {
  return useQuery<ProductsPage>({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll({
      search: params.search,
      groupId: params.groupId ?? undefined,
      page: params.page,
      pageSize: params.pageSize ?? 20,
    }),
    staleTime: 30_000,
  })
}
