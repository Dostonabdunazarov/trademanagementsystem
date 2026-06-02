import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, UserCheck, UserX, Pencil, Trash2 } from 'lucide-react'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UserDto,
  type CreateUserDto,
} from '@/api/hooks/useUsers'
import { useBranches } from '@/api/hooks/useBranches'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const ROLE_META = {
  Admin: { label: 'Admin', color: 'bg-purple-500/15 text-purple-400' },
  Manager: { label: 'Manager', color: 'bg-blue-500/15 text-blue-400' },
  Cashier: { label: 'Cashier', color: 'bg-emerald-500/15 text-emerald-400' },
}

type FormData = {
  fullName: string
  email: string
  password: string
  role: CreateUserDto['role']
  branchId: string
  isActive: boolean
}

const EMPTY_FORM: FormData = { fullName: '', email: '', password: '', role: 'Manager', branchId: '', isActive: true }

function UserDialog({
  open,
  onClose,
  editUser,
}: {
  open: boolean
  onClose: () => void
  editUser: UserDto | null
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormData>(
    editUser
      ? { fullName: editUser.fullName, email: editUser.email, password: '', role: editUser.role, branchId: editUser.branchId ?? '', isActive: editUser.isActive }
      : EMPTY_FORM
  )
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const { data: branches = [] } = useBranches()

  const needsBranch = form.role !== 'Admin'
  const isEdit = !!editUser
  const isPending = createUser.isPending || updateUser.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEdit) {
        const payload: Partial<CreateUserDto> & { isActive?: boolean } = {
          fullName: form.fullName,
          role: form.role,
          isActive: form.isActive,
        }
        if (form.password) payload.password = form.password
        if (needsBranch) payload.branchId = form.branchId || undefined
        await updateUser.mutateAsync({ id: editUser.id, data: payload })
      } else {
        const payload: CreateUserDto = {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(needsBranch && form.branchId ? { branchId: form.branchId } : {}),
        }
        await createUser.mutateAsync(payload)
      }
      onClose()
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t('settings.editUser') : t('settings.addUser')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.userName')}</Label>
            <Input
              placeholder="Иванов Иван"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.userEmail')}</Label>
              <Input
                type="email"
                placeholder="user@company.uz"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-background border-border text-[hsl(var(--text-primary))]"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{isEdit ? 'New password (leave blank to keep)' : 'Password'}</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required={!isEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.userRole')}</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as CreateUserDto['role'], branchId: v === 'Admin' ? '' : f.branchId }))}
            >
              <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                {Object.keys(ROLE_META).map((value) => (
                  <SelectItem key={value} value={value} className="text-[hsl(var(--text-primary))]">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsBranch && (
            <div className="space-y-1.5">
              <Label className="text-[hsl(var(--text-muted))] text-xs">Филиал</Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
              >
                <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]">
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-[hsl(var(--text-primary))]">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
              <Label className="text-[hsl(var(--text-muted))] text-xs cursor-pointer" htmlFor="isActive">
                {t('settings.userStatus')}
              </Label>
              <button
                id="isActive"
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  form.isActive ? 'bg-emerald-500' : 'bg-slate-600'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform',
                    form.isActive ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500">
              {isPending ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteConfirmDialog({
  user,
  onConfirm,
  onClose,
  isPending,
}: {
  user: UserDto
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const { t } = useTranslation()
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-red-400">{t('common.delete')} пользователя</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[hsl(var(--text-muted))] py-2">
          Удалить <span className="text-[hsl(var(--text-primary))] font-medium">{user.fullName}</span>? Это действие необратимо.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isPending} className="bg-red-600 hover:bg-red-500">
            {isPending ? t('common.loading') : t('common.delete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function UsersTab() {
  const { t } = useTranslation()
  const { data: users = [], isLoading } = useUsers()
  const [showDialog, setShowDialog] = useState(false)
  const [editUser, setEditUser] = useState<UserDto | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserDto | null>(null)
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'Admin'
  const deleteUserMutation = useDeleteUser()

  const openCreate = () => { setEditUser(null); setShowDialog(true) }
  const openEdit = (u: UserDto) => { setEditUser(u); setShowDialog(true) }
  const closeDialog = () => { setShowDialog(false); setEditUser(null) }

  const handleDelete = async () => {
    if (!deleteUser) return
    try {
      await deleteUserMutation.mutateAsync(deleteUser.id)
      setDeleteUser(null)
    } catch {}
  }

  const activeCount = users.filter((u) => u.isActive).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-4 py-3">
          <p className="text-xs text-[hsl(var(--text-muted))]">{t('settings.totalUsers')}</p>
          <p className="text-2xl font-bold text-[hsl(var(--text-primary))] mt-1">{users.length}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-4 py-3">
          <p className="text-xs text-[hsl(var(--text-muted))]">{t('settings.activeUsers')}</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-4 py-3">
          <p className="text-xs text-[hsl(var(--text-muted))]">{t('settings.inactiveUsers')}</p>
          <p className="text-2xl font-bold text-[hsl(var(--text-muted))] mt-1">{users.length - activeCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('settings.users')}</h3>
          {isAdmin && (
            <Button
              size="sm"
              onClick={openCreate}
              className="h-7 gap-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('common.add')}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.userName')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.userEmail')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.userRole')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.userStatus')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('common.date')}</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.noData')}</td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleMeta = ROLE_META[u.role]
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            u.isActive
                              ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/20'
                              : 'bg-slate-700/50 text-[hsl(var(--text-muted))]'
                          )}>
                            {u.fullName.charAt(0)}
                          </div>
                          <span className="text-[hsl(var(--text-primary))]">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--text-muted))] text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-[10px] px-1.5 py-0 border-0', roleMeta.color)}>
                          {roleMeta.label ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.isActive ? (
                          <div className="flex items-center justify-center gap-1 text-emerald-400">
                            <UserCheck className="h-3.5 w-3.5" />
                            <span className="text-xs">{t('common.active')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-[hsl(var(--text-muted))]">
                            <UserX className="h-3.5 w-3.5" />
                            <span className="text-xs">{t('common.inactive')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-[hsl(var(--text-muted))] text-xs">
                        {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEdit(u)}
                              className="rounded p-1 text-[hsl(var(--text-muted))] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => setDeleteUser(u)}
                                className="rounded p-1 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserDialog open={showDialog} onClose={closeDialog} editUser={editUser} />
      {deleteUser && (
        <DeleteConfirmDialog
          user={deleteUser}
          onConfirm={handleDelete}
          onClose={() => setDeleteUser(null)}
          isPending={deleteUserMutation.isPending}
        />
      )}
    </div>
  )
}
