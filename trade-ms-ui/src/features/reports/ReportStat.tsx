import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'positive' | 'negative' | 'muted'

const toneCard: Record<Tone, string> = {
  default: 'border-[hsl(var(--border))] bg-card',
  muted: 'border-[hsl(var(--border))] bg-card',
  positive: 'border-emerald-500/20 bg-emerald-500/[0.04]',
  negative: 'border-red-500/20 bg-red-500/[0.04]',
}

const toneValue: Record<Tone, string> = {
  default: 'text-[hsl(var(--text-primary))]',
  muted: 'text-[hsl(var(--text-muted))]',
  positive: 'text-emerald-500',
  negative: 'text-red-500',
}

interface ReportStatProps {
  label: string
  value: ReactNode
  unit?: string
  sub?: ReactNode
  tone?: Tone
}

export function ReportStat({ label, value, unit, sub, tone = 'default' }: ReportStatProps) {
  return (
    <div className={cn('rounded-xl border px-5 py-4', toneCard[tone])}>
      <p className="mb-1 text-xs text-[hsl(var(--text-muted))]">{label}</p>
      <p className={cn('text-2xl font-normal leading-tight tabular-nums tracking-tight', toneValue[tone])}>
        {value}
        {unit && <span className="ml-1.5 text-sm tracking-normal text-[hsl(var(--text-muted))]">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-[hsl(var(--text-muted))]">{sub}</p>}
    </div>
  )
}

export function HeadUnit({ unit }: { unit: string }) {
  return <span className="font-normal normal-case tracking-normal opacity-80">, {unit}</span>
}
