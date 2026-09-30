import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, UserCheck, UserX, Pencil, Trash2 } from 'lucide-react'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UserDto,
  type UserRole,
} from '@/api/hooks/useUsers'
import { useBranches } from '@/api/hooks/useBranches'
import { useAuthStore } from '@/store/auth.store'
import { getApiErrorMessage } from '@/lib/apiError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

const ROLES: UserRole[] = ['Admin', 'Manager', 'Cashier']

const ROLE_COLOR: Record<UserRole, string> = {
  Admin: 'bg-brand-500/15 text-brand-400',
  Manager: 'bg-blue-500/15 text-blue-400',
  Cashier: 'bg-emerald-500/15 text-emerald-400',
}

type FormData = {
  fullName: string
  email: string
  password: string
  role: UserRole
  branchId: string
  isActive: boolean
}

function initialForm(editUser: UserDto | null): FormData {
  return editUser
    ? {
        fullName: editUser.fullName,
        email: editUser.email,
        password: '',
        role: editUser.role,
        branchId: editUser.branchId ?? '',
        isActive: editUser.isActive,
      }
    : { fullName: '', email: '', password: '', role: 'Manager', branchId: '', isActive: true }
}

/** Диалог монтируется при каждом открытии, поэтому форма инициализируется без эффектов. */
function UserDialog({ onClose, editUser }: { onClose: () => void; editUser: UserDto | null }) {
  const { t } = useTranslation()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [form, setForm] = useState<FormData>(() => initialForm(editUser))
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const { data: branches = [] } = useBranches()

  const needsBranch = form.role !== 'Admin'
  const isEdit = !!editUser
  // Сервер запрещает менять себе роль и активность (cannotModifySelf).
  const isSelf = isEdit && editUser.id === currentUserId
  const isPending = createUser.isPending || updateUser.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (needsBranch && !form.branchId) {
      toast.error(t('errors.codes.branchRequiredForRole'))
      return
    }
    const branchId = needsBranch ? form.branchId : null
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: editUser.id,
          data: {
            fullName: form.fullName.trim(),
            role: form.role,
            password: form.password ? form.password : null,
            isActive: form.isActive,
            branchId,
          },
        })
        toast.success(t('settings.userUpdated'))
      } else {
        await createUser.mutateAsync({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          branchId,
        })
        toast.success(t('settings.userCreated'))
      }
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t('settings.editUser') : t('settings.addUser')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" autoComplete="off">
          <div className="space-y-1.5">
            <Label htmlFor="user-fullName" className="text-[hsl(var(--text-muted))] text-xs">{t('settings.userName')}</Label>
            <Input
              id="user-fullName"
              placeholder={t('settings.userNamePlaceholder')}
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-[hsl(var(--text-muted))] text-xs">{t('settings.userEmail')}</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@company.uz"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-background border-border text-[hsl(var(--text-primary))]"
                autoComplete="off"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="user-password" className="text-[hsl(var(--text-muted))] text-xs">
              {isEdit ? t('settings.newPassword') : t('auth.password')}
            </Label>
            <Input
              id="user-password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              autoComplete="new-password"
              required={!isEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.userRole')}</Label>
            <Select
              value={form.role}
              disabled={isSelf}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole, branchId: v === 'Admin' ? '' : f.branchId }))}
            >
              <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]" aria-label={t('settings.userRole')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                {ROLES.map((value) => (
                  <SelectItem key={value} value={value} className="text-[hsl(var(--text-primary))]">
                    {t(`roles.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && <p className="text-[11px] text-[hsl(var(--text-muted))]">{t('settings.cannotModifySelfHint')}</p>}
          </div>
          {needsBranch && (
            <div className="space-y-1.5">
              <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.branch')}</Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
              >
                <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]" aria-label={t('settings.branch')}>
                  <SelectValue placeholder={t('settings.selectBranch')} />
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
                disabled={isSelf}
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
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
            <Button type="submit" disabled={isPending} className="bg-brand-600 hover:bg-brand-500">
              {isPending ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsersTab() {
  const { t, i18n } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'Admin'
  const { data: users = [], isLoading } = useUsers({ enabled: isAdmin })
  const { data: branches = [] } = useBranches()
  // Диалог монтируется заново при каждом открытии — форма всегда свежая.
  const [dialog, setDialog] = useState<{ user: UserDto | null } | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserDto | null>(null)
  const deleteUserMutation = useDeleteUser()

  const openCreate = () => setDialog({ user: null })
  const openEdit = (u: UserDto) => setDialog({ user: u })

  const handleDelete = async () => {
    if (!deleteUser) return
    try {
      await deleteUserMutation.mutateAsync(deleteUser.id)
      toast.success(t('settings.userDeleted'))
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    } finally {
      setDeleteUser(null)
    }
  }

  const branchName = (id: string | null) => (id ? branches.find((b) => b.id === id)?.name ?? '—' : '—')
  const activeCount = users.filter((u) => u.isActive).length
  const dateLocale = i18n.language.startsWith('uz') ? 'uz-UZ' : 'ru-RU'

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
              className="h-7 gap-1.5 bg-brand-600/90 hover:bg-brand-500 text-xs"
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
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.branch')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.userStatus')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('common.date')}</th>
                <th className="px-4 py-2.5 w-16"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.noData')}</td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            u.isActive
                              ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/20'
                              : 'bg-slate-700/50 text-[hsl(var(--text-muted))]'
                          )}>
                            {u.fullName.charAt(0)}
                          </div>
                          <span className="text-[hsl(var(--text-primary))]">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--text-muted))] text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-[10px] px-1.5 py-0 border-0', ROLE_COLOR[u.role] ?? '')}>
                          {t(`roles.${u.role}`, { defaultValue: u.role })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-muted))]">{branchName(u.branchId)}</td>
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
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString(dateLocale) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              aria-label={t('settings.editUserNamed', { name: u.fullName })}
                              title={t('common.edit')}
                              className="rounded p-1 text-[hsl(var(--text-muted))] hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => setDeleteUser(u)}
                                aria-label={t('settings.deleteUserNamed', { name: u.fullName })}
                                title={t('common.delete')}
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

      {dialog && <UserDialog editUser={dialog.user} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={deleteUser != null}
        title={t('settings.deleteUserNamed', { name: deleteUser?.fullName ?? '' })}
        description={t('settings.deleteUserDesc')}
        confirmLabel={t('common.delete')}
        busy={deleteUserMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteUser(null)}
      />
    </div>
  )
}
