import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const THEME_STORAGE_KEY = 'dms-theme'
export type ThemeId = 'dark' | 'light' | 'darkblue' | 'warm' | 'midnight' | 'slate'

const VALID: ThemeId[] = ['dark', 'light', 'darkblue', 'warm', 'midnight', 'slate']

export function readStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v && (VALID as string[]).includes(v)) return v as ThemeId
  } catch { /* ignore */ }
  return 'dark'
}

/** Apply before React paint to reduce flash (call from main.tsx). */
export function applyThemeToDocument(theme: ThemeId) {
  const root = document.documentElement
  if (theme === 'dark') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch { /* ignore */ }
}

type ThemeContextValue = { theme: ThemeId; setTheme: (t: ThemeId) => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
    applyThemeToDocument(t)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
