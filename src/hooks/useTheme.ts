import { useState, useEffect } from 'react'

function safeLocalStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function safeLocalStorageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* silently ignore */ }
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = safeLocalStorageGet('theme')
    if (saved) return saved === 'dark'
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      safeLocalStorageSet('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      safeLocalStorageSet('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)

  return { isDark, toggleTheme }
}
