import { useState } from 'react'
import { Plus, Building2, Trash2, MapPin } from 'lucide-react'
import { useBranches } from '@/api/hooks/useBranches'
import { useCreateBranch, useDeleteBranch } from '@/api/hooks/useBranchMutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function BranchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBranch = useCreateBranch()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createBranch.mutateAsync({ name, address: address || null })
      setName('')
      setAddress('')
      onClose()
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Новый филиал</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">Название</Label>
            <Input
              placeholder="Главный офис"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">Адрес (необязательно)</Label>
            <Input
              placeholder="ул. Амира Темура, 1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
              Отмена
            </Button>
            <Button type="submit" disabled={createBranch.isPending} className="bg-indigo-600 hover:bg-indigo-500">
              {createBranch.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BranchesTab() {
  const { data: branches = [], isLoading } = useBranches()
  const deleteBranch = useDeleteBranch()
  const [showDialog, setShowDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    try {
      await deleteBranch.mutateAsync(id)
    } catch {}
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">Филиалы</h3>
          <Button
            size="sm"
            onClick={() => setShowDialog(true)}
            className="h-7 gap-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Название</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Адрес</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">Загрузка...</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">Нет филиалов</td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
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
                    <td className="px-4 py-3 text-center">
                      {deleteId === b.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="rounded px-2 py-0.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Да
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="rounded px-2 py-0.5 text-xs bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] hover:bg-white/[0.1]"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(b.id)}
                          className="rounded p-1 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BranchDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  )
}
