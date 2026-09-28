import { format } from 'date-fns'

export function formatCurrency(amount: number, currency = 'UZS'): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, pattern = 'dd.MM.yyyy'): string {
  return format(new Date(date), pattern)
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('uz-UZ').format(value)
}

/** Компактная сумма для осей и подписей: 57 000 000 → «57 млн», 12 500 → «13 тыс». */
export function formatCompact(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млрд`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
  if (abs >= 1_000) return `${Math.round(value / 1_000).toLocaleString('ru-RU')} тыс`
  return value.toLocaleString('ru-RU')
}

/** Процент с одним знаком: 21.44 → «21,4 %». */
export function formatPercent(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %`
}
