import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { getApiErrorMessage } from '@/lib/apiError'
import { todayIso } from '@/utils/format'
import { Plus, Star, RefreshCw } from 'lucide-react'
import { useCurrencies, type CurrencyDto } from '@/api/hooks/useCurrencies'
import { useExchangeRates } from '@/api/hooks/useExchangeRates'
import { useCreateCurrency, useCreateExchangeRate } from '@/api/hooks/useCurrencyMutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { format, isValid, parseISO } from 'date-fns'

function formatIsoDate(value: string) {
  const d = parseISO(value)
  return isValid(d) ? format(d, 'dd.MM.yyyy') : value
}

function CurrencyDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ code: '', name: '', isBase: false })
  const createCurrency = useCreateCurrency()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCurrency.mutateAsync({ ...form, code: form.code.trim(), name: form.name.trim() })
      toast.success(t('settings.currencyCreated'))
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t('settings.addCurrency')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.currencyCode')}</Label>
            <Input
              placeholder="USD"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              maxLength={3}
              className="bg-background border-border text-[hsl(var(--text-primary))] uppercase"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.currencyName')}</Label>
            <Input
              placeholder={t('settings.currencyNamePlaceholder')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isBase}
              onChange={(e) => setForm((f) => ({ ...f, isBase: e.target.checked }))}
              className="accent-brand-500"
            />
            <span className="text-sm text-[hsl(var(--text-primary))]">{t('settings.isBase')}</span>
          </label>
          {form.isBase && (
            <p className="text-xs text-orange-400">{t('settings.isBaseWarning')}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createCurrency.isPending} className="bg-brand-600 hover:bg-brand-500">
              {createCurrency.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ExchangeRateDialog({
  onClose,
  currencies,
}: {
  onClose: () => void
  currencies: CurrencyDto[]
}) {
  const { t } = useTranslation()
  const baseId = currencies.find((c) => c.isBase)?.id ?? ''
  const [form, setForm] = useState({
    fromCurrencyId: '',
    // Сервер ищет курс «валюта → базовая», поэтому по умолчанию «в» — базовая.
    toCurrencyId: baseId,
    rate: '',
    date: todayIso(),
  })
  const createRate = useCreateExchangeRate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fromCurrencyId || !form.toCurrencyId) {
      toast.error(t('errors.codes.currencyRequired'))
      return
    }
    try {
      await createRate.mutateAsync({
        ...form,
        rate: parseFloat(form.rate),
      })
      toast.success(t('settings.rateCreated'))
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t('settings.addRate')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('common.from')} {t('common.currency')}</Label>
            <Select value={form.fromCurrencyId} onValueChange={(v) => setForm((f) => ({ ...f, fromCurrencyId: v }))}>
              <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]" aria-label={`${t('common.from')} ${t('common.currency')}`}>
                <SelectValue placeholder={t('settings.selectCurrency')} />
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
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('common.to')} {t('common.currency')}</Label>
            <Select value={form.toCurrencyId} onValueChange={(v) => setForm((f) => ({ ...f, toCurrencyId: v }))}>
              <SelectTrigger className="bg-background border-border text-[hsl(var(--text-primary))]" aria-label={`${t('common.to')} ${t('common.currency')}`}>
                <SelectValue placeholder={t('settings.selectCurrency')} />
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
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.rateValue')}</Label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder="12600.00"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              className="bg-background border-border text-[hsl(var(--text-primary))]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[hsl(var(--text-muted))] text-xs">{t('settings.rateDate')}</Label>
            <DatePicker
              value={form.date}
              onChange={(v) => setForm((f) => ({ ...f, date: v }))}
              className="h-10 bg-background text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createRate.isPending} className="bg-brand-600 hover:bg-brand-500">
              {createRate.isPending ? t('common.loading') : t('common.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CurrenciesTab() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies()
  const { data: rates = [], isLoading: loadingRates } = useExchangeRates()
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false)
  const [showRateDialog, setShowRateDialog] = useState(false)

  return (
    <div className="space-y-6">
      {/* Currencies table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('settings.currencies')}</h3>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowCurrencyDialog(true)}
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
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.currencyCode')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.currencyName')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('common.type')}</th>
              </tr>
            </thead>
            <tbody>
              {loadingCurrencies ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
                </tr>
              ) : currencies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.noData')}</td>
                </tr>
              ) : (
                currencies.map((c) => (
                  <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[hsl(var(--text-primary))]">{c.code}</span>
                        {c.isBase && <Star className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-primary))]">{c.name}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn(
                        'text-[10px] px-1.5 py-0 border-0',
                        c.isBase
                          ? 'bg-orange-500/15 text-orange-400'
                          : 'bg-slate-700/50 text-[hsl(var(--text-muted))]'
                      )}>
                        {c.isBase ? t('settings.isBase') : t('common.currency')}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exchange rates table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-[hsl(var(--text-muted))]" />
            <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('settings.rates')}</h3>
            <span className="text-xs text-[hsl(var(--text-muted))]">({t('settings.latestRates')})</span>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowRateDialog(true)}
              className="h-7 gap-1.5 bg-brand-600/90 hover:bg-brand-500 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('settings.addRate')}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('common.currency')}</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.rateValue')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('settings.rateDate')}</th>
              </tr>
            </thead>
            <tbody>
              {loadingRates ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.noData')}</td>
                </tr>
              ) : (
                rates.map((r) => (
                  <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[hsl(var(--text-primary))]">
                        {r.fromCurrencyCode} → {r.toCurrencyCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400 font-medium">
                      {r.rate.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center text-[hsl(var(--text-muted))] text-xs">{formatIsoDate(r.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCurrencyDialog && <CurrencyDialog onClose={() => setShowCurrencyDialog(false)} />}
      {showRateDialog && (
        <ExchangeRateDialog
          onClose={() => setShowRateDialog(false)}
          currencies={currencies}
        />
      )}
    </div>
  )
}
