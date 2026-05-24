import { useCallback, useState } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';

export default function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
  serialize: (v: T) => string = (v) => String(v),
  deserialize: (s: string) => T = (s) => (s as unknown as T)
): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = safeLocalStorageGet(storageKey);
      return saved !== null && saved !== undefined ? deserialize(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersisted = useCallback((v: T) => {
    setState(v);
    try {
      safeLocalStorageSet(storageKey, serialize(v));
    } catch {
      // ignore storage errors
    }
  }, [storageKey, serialize]);

  return [state, setPersisted];
}
