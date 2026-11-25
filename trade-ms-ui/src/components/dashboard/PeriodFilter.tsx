import { useMemo, useState } from 'react'
import { presetRange, type PeriodRange, type PresetKey } from './period'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'

interface PeriodFilterProps {
  value: PeriodRange
  onChange: (range: PeriodRange) => void
  className?: string
}

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  const { t } = useTranslation()
  const now = useMemo(() => new Date(), [])
  const [active, setActive] = useState<PresetKey>('thisMonth')

  const presets: { key: Exclude<PresetKey, 'custom'>; label: string }[] = [
    { key: 'thisMonth', label: t('dashboard.periodThisMonth') },
    { key: 'lastMonth', label: t('dashboard.periodLastMonth') },
    { key: 'quarter', label: t('dashboard.periodQuarter') },
    { key: 'year', label: t('dashboard.periodYear') },
  ]

  const selectPreset = (key: Exclude<PresetKey, 'custom'>) => {
    setActive(key)
    onChange(presetRange(key, now))
  }

  const setCustom = (patch: Partial<PeriodRange>) => {
    setActive('custom')
    onChange({ ...value, ...patch })
  }

  const pickerClass =
    'h-full w-auto min-w-0 rounded-none border-0 bg-transparent px-2 font-medium hover:border-0 focus-visible:ring-0 data-[state=open]:ring-0 data-[state=open]:text-brand-500'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div
        role="group"
        aria-label={t('dashboard.period')}
        className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-0.5"
      >
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={active === p.key}
            onClick={() => selectPreset(p.key)}
            className={cn(
              'h-full rounded-md px-3 text-xs font-medium transition-[color,background-color,box-shadow] duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              active === p.key
                ? 'bg-[hsl(var(--surface))] font-semibold text-brand-500 shadow-sm ring-1 ring-[hsl(var(--border))]'
                : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface))]/60 hover:text-[hsl(var(--text-primary))]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'inline-flex h-9 items-center rounded-lg border bg-[hsl(var(--surface))] transition-colors',
          'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
          active === 'custom' ? 'border-brand-500/60' : 'border-[hsl(var(--border))]',
        )}
      >
        <label htmlFor="period-from" className="pl-3 text-xs text-[hsl(var(--text-muted))]">
          {t('dashboard.from')}
        </label>
        <DatePicker
          id="period-from"
          value={value.dateFrom}
          max={value.dateTo}
          onChange={(v) => setCustom({ dateFrom: v })}
          className={pickerClass}
        />
        <span aria-hidden className="h-4 w-px bg-[hsl(var(--border))]" />
        <label htmlFor="period-to" className="pl-3 text-xs text-[hsl(var(--text-muted))]">
          {t('dashboard.to')}
        </label>
        <DatePicker
          id="period-to"
          value={value.dateTo}
          min={value.dateFrom}
          onChange={(v) => setCustom({ dateTo: v })}
          className={cn(pickerClass, 'pr-3')}
        />
      </div>
    </div>
  )
}
