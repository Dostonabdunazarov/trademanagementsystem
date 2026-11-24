import { format } from 'date-fns'
import i18n from '@/i18n'

/** «Сегодня» (yyyy-MM-dd) в локальной таймзоне пользователя, а не в UTC, как `toISOString()`. */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

const NBSP = ' '
const numberFormat = new Intl.NumberFormat('ru-RU')

export function formatCurrency(amount: number, currency = 'UZS'): string {
  const rounded = Math.round(amount)
  if (currency === 'UZS') return `${numberFormat.format(rounded)}${NBSP}${i18n.t('dashboard.sum')}`
  return `${numberFormat.format(rounded)}${NBSP}${currency}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return numberFormat.format(value)
}

/** Компактная сумма для осей и подписей: 57 000 000 → «57 млн», 12 500 → «13 тыс» (на языке интерфейса). */
export function formatCompact(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const short = (n: number, unit: string) => `${n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}${NBSP}${i18n.t(unit)}`
  if (abs >= 1_000_000_000) return short(value / 1_000_000_000, 'units.billion')
  if (abs >= 1_000_000) return short(value / 1_000_000, 'units.million')
  if (abs >= 1_000) return `${Math.round(value / 1_000).toLocaleString('ru-RU')}${NBSP}${i18n.t('units.thousand')}`
  return value.toLocaleString('ru-RU')
}

/** Процент с одним знаком: 21.44 → «21,4 %». */
export function formatPercent(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}${NBSP}%`
}
