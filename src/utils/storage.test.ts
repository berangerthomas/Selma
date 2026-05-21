import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { safeLocalStorageGet, safeLocalStorageSet, STORAGE_KEYS } from './storage'

describe('storage utils', () => {
  beforeEach(() => {
    // provide a simple in-memory localStorage mock
    const store: Record<string, string> = {}
    const mock = {
      getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
      setItem: vi.fn((k: string, v: string) => { store[k] = String(v) }),
      removeItem: vi.fn((k: string) => { delete store[k] }),
      clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
    }
    vi.stubGlobal('localStorage', mock as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reads and writes via safe helpers', () => {
    safeLocalStorageSet(STORAGE_KEYS.viewMode, 'compact')
    const v = safeLocalStorageGet(STORAGE_KEYS.viewMode)
    expect(v).toBe('compact')
  })

  it('returns null when localStorage.getItem throws', () => {
    // make getItem throw
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('fail') } } as any)
    expect(safeLocalStorageGet('whatever')).toBeNull()
  })

  it('does not throw when setItem throws', () => {
    const setMock = vi.fn(() => { throw new Error('nope') })
    vi.stubGlobal('localStorage', { setItem: setMock } as any)
    // should not throw
    expect(() => safeLocalStorageSet('k', 'v')).not.toThrow()
  })

  it('exposes expected STORAGE_KEYS', () => {
    expect(STORAGE_KEYS).toHaveProperty('viewMode')
    expect(STORAGE_KEYS).toHaveProperty('activeTaxonomyId')
    expect(STORAGE_KEYS).toHaveProperty('selectedTags')
    expect(typeof STORAGE_KEYS.viewMode).toBe('string')
  })
})
