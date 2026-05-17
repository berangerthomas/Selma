import { useState, useEffect } from 'react'

import { safeLocalStorageGet, safeLocalStorageSet, STORAGE_KEYS } from '../utils/storage';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.theme)
    if (saved) return saved === 'dark'
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      safeLocalStorageSet(STORAGE_KEYS.theme, 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      safeLocalStorageSet(STORAGE_KEYS.theme, 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)

  return { isDark, toggleTheme }
}
