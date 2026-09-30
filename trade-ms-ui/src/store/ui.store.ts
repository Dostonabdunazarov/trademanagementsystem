import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

interface Branch {
  id: string
  name: string
}

export const UI_STORAGE_KEY = 'ui-storage'

export type Language = 'ru' | 'uz'
export type Theme = 'dark' | 'light'

interface UiStore {
  activeBranch: Branch | null
  sidebarOpen: boolean
  language: Language
  theme: Theme
  setActiveBranch: (branch: Branch) => void
  clearActiveBranch: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setLanguage: (lang: Language) => void
  toggleTheme: () => void
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  html.classList.toggle('light', theme === 'light')
  if (theme === 'light') {
    document.body.style.backgroundColor = '#e4e7f2'
    document.body.style.backgroundImage = ''
  } else {
    document.body.style.backgroundColor = ''
    document.body.style.backgroundImage = ''
  }
}

// Apply theme immediately from localStorage to avoid flash
;(function syncTheme() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const theme: Theme = parsed?.state?.theme
      applyTheme(theme ?? 'dark')
    } else {
      applyTheme('dark')
    }
  } catch {
    // Повреждённый localStorage — остаётся тема по умолчанию.
    applyTheme('dark')
  }
})()

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      activeBranch: null,
      sidebarOpen: true,
      language: 'ru',
      theme: 'dark',
      setActiveBranch: (branch) => set({ activeBranch: branch }),
      clearActiveBranch: () => set({ activeBranch: null }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setLanguage: (lang) => {
        i18n.changeLanguage(lang)
        set({ language: lang })
      },
      toggleTheme: () =>
        set((s) => {
          const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
          applyTheme(next)
          return { theme: next }
        }),
    }),
    {
      name: UI_STORAGE_KEY,
      partialize: (s) => ({ activeBranch: s.activeBranch, language: s.language, theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.language) i18n.changeLanguage(state.language)
        if (state?.theme) applyTheme(state.theme)
      },
    }
  )
)
