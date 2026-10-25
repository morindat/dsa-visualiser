import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'dsviz.theme'

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  if (typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/**
 * Applies the selected theme to <html data-theme> and persists the choice.
 * The CSS palette in `index.css` owns every colour; this hook only flips the key.
 */
export function useTheme(): {
  theme: Theme
  setTheme(theme: Theme): void
  toggleTheme(): void
} {
  const [theme, setThemeState] = useState<Theme>(
    () => readStoredTheme() ?? systemTheme(),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'dark' ? '#0d1117' : '#eef2f6')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Private mode can refuse storage; the in-memory theme still works.
    }
  }, [theme])

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback((): void => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggleTheme }
}
