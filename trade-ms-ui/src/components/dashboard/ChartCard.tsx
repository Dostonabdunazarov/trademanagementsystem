import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  /** Пояснение под заголовком: что и как посчитано. */
  subtitle?: string
  /** Справа от заголовка: итоговое число, легенда и т.п. */
  aside?: ReactNode
  loading?: boolean
  /** Высота области графика — чтобы скелетон и пустое состояние не прыгали. */
  bodyHeight?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/** Карточка виджета дашборда: заголовок, скелетон при загрузке, тело. */
export function ChartCard({
  title, subtitle, aside, loading, bodyHeight = 224, className, style, children,
}: ChartCardProps) {
  return (
    <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)} style={style}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-[hsl(var(--text-muted))]">{subtitle}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {loading ? (
        <div className="animate-pulse rounded-lg bg-[hsl(var(--surface-2))]" style={{ height: bodyHeight }} />
      ) : (
        children
      )}
    </div>
  )
}

/** Пустое состояние в области графика. */
export function ChartEmpty({ text, height = 224 }: { text: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] text-xs text-[hsl(var(--text-muted))]"
      style={{ height }}
    >
      {text}
    </div>
  )
}

/** Оболочка тултипа Recharts в стиле карточек. */
export function ChartTooltipBox({ title, rows }: {
  title: ReactNode
  rows: { color?: string; label: string; value: string }[]
}) {
  return (
    <div className="chart-tooltip min-w-[160px] rounded-lg border border-[hsl(var(--border))] px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-xs font-semibold text-[hsl(var(--text-primary))]">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="mt-1 flex items-center gap-2 text-xs first:mt-0">
          {r.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />}
          <span className="text-[hsl(var(--text-muted))]">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-[hsl(var(--text-primary))]">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
