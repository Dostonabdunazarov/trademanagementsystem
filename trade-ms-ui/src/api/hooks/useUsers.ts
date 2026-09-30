import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../users'

export type UserRole = 'Admin' | 'Manager' | 'Cashier'

/** UserDto на бэкенде. */
export interface UserDto {
  id: string
  companyId: string
  branchId: string | null
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

/** CreateUserRequest на бэкенде. */
export interface CreateUserDto {
  fullName: string
  email: string
  password: string
  role: UserRole
  branchId: string | null
}

/** UpdateUserRequest на бэкенде. `password: null` — не менять. */
export interface UpdateUserDto {
  fullName: string
  role: UserRole
  password: string | null
  isActive: boolean
  branchId: string | null
}

/** `GET /users` доступен только Admin — для остальных запрос не отправляем. */
export function useUsers(options: { enabled?: boolean } = {}) {
  return useQuery<UserDto[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
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
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) => usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
