import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useUiStore, type Language } from '@/store/ui.store'
import { FlagRU, FlagUZ } from '@/components/ui/Flags'
import { cn } from '@/lib/utils'

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'uz', label: "O'zbekcha" },
]

/** SVG-флаг по языку (полноцветный на всех ОС, в отличие от эмодзи-флагов). */
function Flag({ lng, className }: { lng: Language; className?: string }) {
  return lng === 'ru' ? <FlagRU className={className} /> : <FlagUZ className={className} />
}

/**
 * Переключатель языка (dropdown). Триггер показывает флаг и код текущего языка,
 * список открывается по клику; закрывается кликом вне и Escape.
 */
export function LanguageSelect({ className }: { className?: string }) {
  const { language, setLanguage } = useUiStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/60 px-2.5 py-1.5',
          'text-xs font-semibold uppercase text-[hsl(var(--text-primary))] backdrop-blur-md transition-colors',
          'hover:bg-[hsl(var(--surface-2))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        <Flag lng={current.code} className="h-3 w-[1.125rem]" />
        <span>{current.code}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-[hsl(var(--text-muted))] transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute right-0 z-50 mt-2 w-40 origin-top overflow-hidden rounded-xl',
            'border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/95 p-1 shadow-xl backdrop-blur-xl',
            'animate-dropdown-in',
          )}
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="option" aria-selected={lang.code === language}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(lang.code)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                  lang.code === language
                    ? 'bg-brand-500/15 text-brand-300'
                    : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--accent-glow))] hover:text-[hsl(var(--text-primary))]',
                )}
              >
                <span className="flex items-center gap-2">
                  <Flag lng={lang.code} className="h-3.5 w-5" />
                  {lang.label}
                </span>
                <span className="text-xs uppercase opacity-60">{lang.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
