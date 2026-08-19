import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { useUiStore, type Language } from '@/store/ui.store'
import { cn } from '@/lib/utils'

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
]

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
          'flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/60 px-2.5 py-1.5',
          'text-xs font-medium text-[hsl(var(--text-primary))] backdrop-blur-md transition-colors',
          'hover:bg-[hsl(var(--surface-2))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        )}
      >
        <Languages className="h-3.5 w-3.5 text-[hsl(var(--text-muted))]" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="uppercase">{current.code}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-[hsl(var(--text-muted))] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute right-0 z-50 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-lg',
            'border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/95 p-1 shadow-xl backdrop-blur-xl',
          )}
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang.code === language}
                onClick={() => {
                  setLanguage(lang.code)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium transition-colors',
                  lang.code === language
                    ? 'bg-teal-500/15 text-teal-300'
                    : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--accent-glow))] hover:text-[hsl(var(--text-primary))]',
                )}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="flex-1">{lang.label}</span>
                {lang.code === language && <Check className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
