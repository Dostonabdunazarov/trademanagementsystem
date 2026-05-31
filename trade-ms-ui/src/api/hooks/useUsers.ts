import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../users'

export interface UserDto {
  id: string
  fullName: string
  email: string
  role: 'Admin' | 'Manager' | 'Cashier'
  isActive: boolean
  branchId: string | null
  createdAt: string
}

export interface CreateUserDto {
  fullName: string
  email: string
  password: string
  role: 'Admin' | 'Manager' | 'Cashier'
  branchId?: string
}

export function useUsers() {
  return useQuery<UserDto[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    staleTime: 5 * 60_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserDto> & { isActive?: boolean } }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

