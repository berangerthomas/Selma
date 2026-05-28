import { useCallback, useState, useRef } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';
import type { StorageKey } from '../utils/storage';

export default function usePersistedState<T>(
  storageKey: StorageKey,
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

  // Stabilize serializer/deserializer references so that callers may pass
  // inline functions without forcing setPersisted to change on every render.
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;

  const setPersisted = useCallback((v: T) => {
    setState(v);
    try {
      safeLocalStorageSet(storageKey, serializeRef.current(v));
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  return [state, setPersisted];
}
