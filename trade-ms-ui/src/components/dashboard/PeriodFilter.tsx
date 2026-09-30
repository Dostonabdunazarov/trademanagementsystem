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

  return (
    <div className={cn('flex flex-wrap items-end gap-2', className)}>
      <div className="flex flex-wrap gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-1">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => selectPreset(p.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              active === p.key
                ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30'
                : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">
            {t('dashboard.from')}
          </label>
          <DatePicker
            value={value.dateFrom}
            max={value.dateTo}
            onChange={(v) => setCustom({ dateFrom: v })}
            className="bg-[hsl(var(--surface))]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">
            {t('dashboard.to')}
          </label>
          <DatePicker
            value={value.dateTo}
            min={value.dateFrom}
            onChange={(v) => setCustom({ dateTo: v })}
            className="bg-[hsl(var(--surface))]"
          />
        </div>
      </div>
    </div>
  )
}
