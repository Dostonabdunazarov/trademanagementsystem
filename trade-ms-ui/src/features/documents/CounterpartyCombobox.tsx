import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useCounterparties, type CounterpartyDto } from '@/api/hooks/useCounterparties'

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function balanceCls(balance: number) {
  return balance > 0 ? 'text-red-400' : balance < 0 ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]'
}

interface CounterpartyComboboxProps {
  /** Сервер вернёт этот тип и контрагентов с типом Both. */
  type: 'Customer' | 'Supplier'
  selectedId: string
  selectedName: string
  onSelect: (cp: CounterpartyDto) => void
  readOnly?: boolean
  placeholder?: string
  /** Подпись поля для скринридеров (видимая подпись рисуется снаружи). */
  label: string
  className?: string
  optionClassName?: string
}

/**
 * Поиск и выбор контрагента. Работает с клавиатуры: ↑/↓ — выбор строки,
 * Enter — подтвердить, Esc — закрыть. Роли combobox/listbox/option по WAI-ARIA.
 */
export function CounterpartyCombobox({
  type, selectedId, selectedName, onSelect, readOnly = false, placeholder, label, className, optionClassName,
}: CounterpartyComboboxProps) {
  const { t } = useTranslation()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(-1)
  const debouncedSearch = useDebouncedValue(search, 250)

  const { data, isFetching } = useCounterparties(type, debouncedSearch || undefined)
  const items = open ? data?.items ?? [] : []

  // Закрытие по клику вне поля.
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Подсвеченная строка всегда видна в прокручиваемом списке.
  useEffect(() => {
    if (active < 0) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  function openList() {
    if (readOnly) return
    setSearch('')
    setActive(-1)
    setOpen(true)
  }

  function choose(cp: CounterpartyDto) {
    onSelect(cp)
    setSearch('')
    setActive(-1)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (readOnly) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) { openList(); return }
        setActive((i) => (items.length ? (i + 1) % items.length : -1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) { openList(); return }
        setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1))
        break
      case 'Enter':
        if (open && active >= 0 && items[active]) {
          e.preventDefault()
          choose(items[active])
        } else if (open && items.length === 1) {
          e.preventDefault()
          choose(items[0])
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const activeId = open && active >= 0 && items[active] ? `${listId}-opt-${active}` : undefined

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        placeholder={placeholder ?? t('documents.selectCounterparty')}
        value={open ? search : selectedName}
        onFocus={openList}
        onClick={() => { if (!open) openList() }}
        onChange={(e) => {
          if (readOnly) return
          setSearch(e.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        className={cn(className, readOnly && 'opacity-70 cursor-default')}
      />
      {open && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={label}
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border',
            'bg-card/95 backdrop-blur-xl shadow-xl max-h-48 overflow-y-auto',
          )}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[hsl(var(--text-muted))]">
              {isFetching ? t('common.loading') : t('counterparties.noCounterparties')}
            </div>
          ) : (
            items.map((cp, idx) => (
              <div
                key={cp.id}
                id={`${listId}-opt-${idx}`}
                data-index={idx}
                role="option"
                aria-selected={selectedId === cp.id}
                // mousedown не должен уводить фокус из поля до click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(cp)}
                onMouseEnter={() => setActive(idx)}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between px-3 py-2 transition-colors',
                  idx === active ? 'bg-[hsl(var(--surface-2))]' : 'hover:bg-[hsl(var(--surface-2))]',
                  selectedId === cp.id ? 'text-brand-400' : 'text-[hsl(var(--text-primary))]',
                  optionClassName ?? 'text-xs',
                )}
              >
                <span className="truncate">{cp.name}</span>
                <span className={cn('font-mono ml-2 shrink-0 text-xs', balanceCls(cp.balance))}>
                  {fmt(cp.balance)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
