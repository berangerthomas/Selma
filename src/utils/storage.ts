export function safeLocalStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function safeLocalStorageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* silently ignore */ }
}