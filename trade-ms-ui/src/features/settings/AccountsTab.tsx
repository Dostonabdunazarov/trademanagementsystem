import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Landmark, Banknote, Trash2 } from 'lucide-react'
import { useAccounts, useCreateAccount, useDeleteAccount, type CreateAccountDto } from '@/api/hooks/useAccounts'
import { useUiStore } from '@/store/ui.store'
import { useCurrencies } from '@/api/hooks/useCurrencies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPE_META = {
  Cash: { labelKey: 'settings.Cash', icon: Banknote, color: 'bg-emerald-500/15 text-emerald-400' },
  Bank: { labelKey: 'settings.Bank', icon: Landmark, color: 'bg-blue-500/15 text-blue-400' },
}

function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: currencies = [] } = useCurrencies()
  const createAccount = useCreateAccount()
  const [form, setForm] = useState<CreateAccountDto>({
    name: '',
    type: 'Cash',
    currencyId: '',
    branchId: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAccount.mutateAsync(form)
      onClose()
      setForm({ name: '', type: 'Cash', currencyId: '', branchId: '' })
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t('settings.addAccount')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.accountName')}</Label>
            <Input
              placeholder="Главная касса"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.accountType')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['Cash', 'Bank'] as const).map((type) => {
                const meta = TYPE_META[type]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type }))}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                      form.type === type
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                        : 'border-border bg-background text-[hsl(var(--text-muted))] hover:border-white/20'
                    )}
                  >
                    <meta.icon className="h-4 w-4" />
                    {t(meta.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('common.currency')}</Label>
            <Select value={form.currencyId} onValueChange={(v) => setForm((f) => ({ ...f, currencyId: v }))}>
              <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]">
                <SelectValue placeholder="Выберите валюту" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[hsl(var(--text-primary))]">
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createAccount.isPending} className="bg-indigo-600 hover:bg-indigo-500">
              {createAccount.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AccountsTab() {
  const { t } = useTranslation()
  const { activeBranch } = useUiStore()
  const { data: accounts = [], isLoading } = useAccounts(activeBranch?.id)
  const deleteAccount = useDeleteAccount()
  const [showDialog, setShowDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const totalByCurrency = accounts.reduce<Record<string, { code: string; cash: number; bank: number }>>((acc, a) => {
    if (!acc[a.currencyCode]) acc[a.currencyCode] = { code: a.currencyCode, cash: 0, bank: 0 }
    if (a.type === 'Cash') acc[a.currencyCode].cash += a.balance
    else acc[a.currencyCode].bank += a.balance
    return acc
  }, {})

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount.mutateAsync(id)
    } catch {}
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {Object.values(totalByCurrency).length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(totalByCurrency).map((cur) => (
            <div key={cur.code} className="rounded-xl border border-[hsl(var(--border))] bg-card px-4 py-3">
              <p className="text-xs text-[hsl(var(--text-muted))] mb-2 font-mono font-semibold">{cur.code}</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] text-[hsl(var(--text-muted))]">{t('settings.Cash')}</p>
                  <p className="text-sm font-semibold text-emerald-400">{cur.cash.toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(var(--text-muted))]">{t('settings.Bank')}</p>
                  <p className="text-sm font-semibold text-blue-400">{cur.bank.toLocaleString('ru-RU')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('settings.accounts')}</h3>
          <Button
            size="sm"
            onClick={() => setShowDialog(true)}
            className="h-7 gap-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('common.add')}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.accountName')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.accountType')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('common.currency')}</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('counterparties.balance')}</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.noData')}</td>
                </tr>
              ) : (
                accounts.map((a) => {
                  const meta = TYPE_META[a.type]
                  const Icon = meta.icon
                  return (
                    <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[hsl(var(--text-muted))] shrink-0" />
                          <span className="text-[hsl(var(--text-primary))]">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-[10px] px-1.5 py-0 border-0', meta.color)}>
                          {t(meta.labelKey)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[hsl(var(--text-muted))]">{a.currencyCode}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[hsl(var(--text-primary))]">
                        {a.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deleteId === a.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="rounded px-2 py-0.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              {t('common.yes')}
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="rounded px-2 py-0.5 text-xs bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] hover:bg-white/[0.1]"
                            >
                              {t('common.no')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(a.id)}
                            className="rounded p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      <AccountDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  )
}
