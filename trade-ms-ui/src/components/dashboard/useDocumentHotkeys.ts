import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Горячие клавиши документов. F5 не занимаем: это «обновить страницу» в браузере,
 * поэтому выплата — на F7.
 */
const DOCUMENT_HOTKEYS = [
  { key: 'F1', to: '/expense' },
  { key: 'F2', to: '/income' },
  { key: 'F3', to: '/return-customer' },
  { key: 'F4', to: '/return-supplier' },
  { key: 'F6', to: '/pay-in' },
  { key: 'F7', to: '/pay-out' },
] as const

/** Фокус в поле ввода или в открытом диалоге — клавиши принадлежат им, а не навигации. */
function shouldIgnore(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.repeat) return true
  if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return true
  const target = e.target instanceof Element ? e.target : null
  const active = document.activeElement
  for (const el of [target, active]) {
    if (!(el instanceof HTMLElement)) continue
    if (el.isContentEditable) return true
    if (el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true
    if (el.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) return true
  }
  // Открытый модальный диалог (фокус может быть и на body после клика по подложке).
  return !!document.querySelector('[role="dialog"], [role="alertdialog"]')
}

export function useDocumentHotkeys() {
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = DOCUMENT_HOTKEYS.find((a) => a.key === e.key)
      if (!action || shouldIgnore(e)) return
      e.preventDefault()
      navigate(action.to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}
