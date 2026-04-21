import { useState, useEffect } from 'react';

const sizes = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl', 'prose-2xl'];
const STORAGE_KEY = 'selma-text-size';
const EVENT_NAME = 'selma:text-size'

export function useTextSize() {
  const [sizeIndex, setSizeIndex] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const idx = sizes.indexOf(saved);
      if (idx !== -1) return idx;
    }
    // Default adaptive size when no preference is saved:
    // - Desktop (>= 1024px): 'prose-lg' (index 2) for better comfort on large screens
    // - Mobile/Tablet (< 1024px): 'prose-base' (index 1) to better fit smaller screens
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return 2;
    }
    return 1;
  });

  // Persist and broadcast changes so other hook instances sync immediately
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sizes[sizeIndex]);
    } catch (err) {
      // ignore
    }
    try {
      const ev = new CustomEvent(EVENT_NAME, { detail: sizes[sizeIndex] })
      window.dispatchEvent(ev)
    } catch (err) {
      // ignore
    }
  }, [sizeIndex]);

  // Listen for external changes (other components or other tabs)
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined
      if (detail) {
        const idx = sizes.indexOf(detail)
        if (idx !== -1) setSizeIndex(idx)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && typeof e.newValue === 'string') {
        const idx = sizes.indexOf(e.newValue)
        if (idx !== -1) setSizeIndex(idx)
      }
    }

    window.addEventListener(EVENT_NAME, handleEvent as EventListener)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(EVENT_NAME, handleEvent as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const increaseSize = () => {
    setSizeIndex((prev) => Math.min(prev + 1, sizes.length - 1));
  };

  const decreaseSize = () => {
    setSizeIndex((prev) => Math.max(prev - 1, 0));
  };

  const canIncrease = sizeIndex < sizes.length - 1;
  const canDecrease = sizeIndex > 0;
  const textSizeClass = sizes[sizeIndex];

  return { textSizeClass, increaseSize, decreaseSize, canIncrease, canDecrease };
}
