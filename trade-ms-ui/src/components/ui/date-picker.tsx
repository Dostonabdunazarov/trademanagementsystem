import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { ru, uz } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** Дата в формате yyyy-MM-dd; пустая строка — не выбрана. */
  value: string
  onChange: (value: string) => void
  /** Границы выбора в формате yyyy-MM-dd. */
  min?: string
  max?: string
  /** Поле только для чтения (проведённый документ и т.п.). */
  disabled?: boolean
  /** Показывать кнопку «Очистить» — для фильтров, где дата необязательна. */
  clearable?: boolean
  placeholder?: string
  className?: string
  id?: string
}

const ISO = 'yyyy-MM-dd'

function parse(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

/**
 * Выбор даты: триггер в стиле полей ввода + календарь во всплывающем окне.
 * Значение — строка yyyy-MM-dd, как у нативного <input type="date">, поэтому
 * заменяет его без изменения логики форм.
 */
export function DatePicker({
  value, onChange, min, max, disabled, clearable, placeholder, className, id,
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = parse(value)
  const minDate = parse(min)
  const maxDate = parse(max)
  const locale = i18n.language.startsWith('uz') ? uz : ru

  const pick = (d: Date | undefined) => {
    if (!d) return
    onChange(format(d, ISO))
    setOpen(false)
  }

  // ISO-строки сравниваются лексикографически как даты.
  const todayIso = format(new Date(), ISO)
  const todayAllowed = (!min || todayIso >= min) && (!max || todayIso <= max)

  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  return (
    <Popover.Root open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          data-date-picker=""
          className={cn(
            'group inline-flex h-8 w-full min-w-[8.5rem] items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 text-left text-xs text-[hsl(var(--text-primary))]',
            'transition-[border-color,box-shadow] duration-200 hover:border-brand-500/50',
            'focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/25',
            'data-[state=open]:border-brand-500 data-[state=open]:ring-2 data-[state=open]:ring-brand-500/25',
            'disabled:cursor-default disabled:opacity-70 disabled:hover:border-border',
            className,
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--text-muted))] transition-colors group-data-[state=open]:text-brand-400" />
          <span className={cn('flex-1 truncate tabular-nums', !selected && 'text-[hsl(var(--text-muted))]')}>
            {selected ? format(selected, 'dd.MM.yyyy') : (placeholder ?? t('datePicker.placeholder'))}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // Анимация появления/скрытия — .date-picker-content в index.css.
          className="date-picker-content z-50 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/30"
        >
          <DayPicker
            className="date-picker"
            mode="single"
            required
            selected={selected}
            onSelect={pick}
            defaultMonth={selected ?? new Date()}
            disabled={disabledDays}
            locale={locale}
            weekStartsOn={1}
            showOutsideDays
            animate
            autoFocus
          />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => pick(new Date())}
              disabled={!todayAllowed}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-500/10 disabled:pointer-events-none disabled:opacity-40"
            >
              {t('datePicker.today')}
            </button>
            {clearable && value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[hsl(var(--text-muted))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]"
              >
                <X className="h-3 w-3" />
                {t('datePicker.clear')}
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
