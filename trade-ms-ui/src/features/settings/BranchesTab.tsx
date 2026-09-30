import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Building2, Trash2, MapPin } from 'lucide-react'
import { useBranches, type BranchDto } from '@/api/hooks/useBranches'
import { useCreateBranch, useDeleteBranch } from '@/api/hooks/useBranchMutations'
import { useAuthStore } from '@/store/auth.store'
import { getApiErrorMessage } from '@/lib/apiError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

function BranchDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const createBranch = useCreateBranch()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createBranch.mutateAsync({ name: name.trim(), address: address.trim() || null })
      toast.success(t('settings.branchCreated'))
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t('settings.newBranch')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name" className="text-[hsl(var(--text-muted))] text-xs">{t('settings.branchName')}</Label>
            <Input
              id="branch-name"
              placeholder={t('settings.branchNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-address" className="text-[hsl(var(--text-muted))] text-xs">{t('settings.branchAddressOptional')}</Label>
            <Input
              id="branch-address"
              placeholder={t('settings.branchAddressPlaceholder')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createBranch.isPending} className="bg-brand-600 hover:bg-brand-500">
              {createBranch.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BranchesTab() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const { data: branches = [], isLoading } = useBranches()
  const deleteBranch = useDeleteBranch()
  const [showDialog, setShowDialog] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BranchDto | null>(null)

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteBranch.mutateAsync(pendingDelete.id)
      toast.success(t('settings.branchDeleted'))
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('settings.branches')}</h3>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowDialog(true)}
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
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.branchName')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.branchAddress')}</th>
                {isAdmin && <th className="px-4 py-2.5 w-10"><span className="sr-only">{t('common.actions')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('branches.none')}</td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="text-[hsl(var(--text-primary))]">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {b.address ? (
                        <div className="flex items-center gap-1.5 text-[hsl(var(--text-muted))]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {b.address}
                        </div>
                      ) : (
                        <span className="text-[hsl(var(--text-muted))]">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPendingDelete(b)}
                          aria-label={t('settings.deleteBranchNamed', { name: b.name })}
                          title={t('common.delete')}
                          className="rounded p-1 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDialog && <BranchDialog onClose={() => setShowDialog(false)} />}
      <ConfirmDialog
        open={pendingDelete != null}
        title={t('settings.deleteBranchNamed', { name: pendingDelete?.name ?? '' })}
        description={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        busy={deleteBranch.isPending}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
