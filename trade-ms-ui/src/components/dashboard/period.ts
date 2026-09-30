import {
  format,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
} from 'date-fns'

export interface PeriodRange {
  dateFrom: string
  dateTo: string
}

export type PresetKey = 'thisMonth' | 'lastMonth' | 'quarter' | 'year' | 'custom'

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

export function presetRange(key: Exclude<PresetKey, 'custom'>, now: Date): PeriodRange {
  switch (key) {
    case 'thisMonth':
      return { dateFrom: fmt(startOfMonth(now)), dateTo: fmt(endOfMonth(now)) }
    case 'lastMonth': {
      const prev = subMonths(now, 1)
      return { dateFrom: fmt(startOfMonth(prev)), dateTo: fmt(endOfMonth(prev)) }
    }
    case 'quarter':
      return { dateFrom: fmt(startOfQuarter(now)), dateTo: fmt(endOfQuarter(now)) }
    case 'year':
      return { dateFrom: fmt(startOfYear(now)), dateTo: fmt(endOfYear(now)) }
  }
}

/** Период дашборда по умолчанию — текущий месяц. */
export function defaultPeriod(): PeriodRange {
  return presetRange('thisMonth', new Date())
}
