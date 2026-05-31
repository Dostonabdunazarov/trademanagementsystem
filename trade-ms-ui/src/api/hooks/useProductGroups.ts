import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../products'

export interface ProductGroupDto {
  id: string
  name: string
  parentId: string | null
  children?: ProductGroupDto[]
}

export function useProductGroups() {
  return useQuery<ProductGroupDto[]>({
    queryKey: ['product-groups'],
    queryFn: () => productsApi.getGroups(),
    staleTime: 5 * 60_000,
  })
}
