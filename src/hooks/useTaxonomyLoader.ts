import { useEffect, useState } from 'react';
import { safeLocalStorageGet, STORAGE_KEYS } from '../utils/storage';
import type { TaxonomyDescription } from '../types';

export function useTaxonomyLoader() {
  const [availableTaxonomies, setAvailableTaxonomies] = useState<TaxonomyDescription[]>([]);
  const [activeTaxonomyId, setActiveTaxonomyId] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/taxonomies.json', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TaxonomyDescription[]) => {
        setAvailableTaxonomies(data);
        if (data.length > 0) {
          const p = new URLSearchParams(window.location.search);
          const urlTaxo = p.get('taxonomy');
          const savedTaxo = urlTaxo || safeLocalStorageGet(STORAGE_KEYS.activeTaxonomyId);
          const nextTaxonomyId = savedTaxo && data.find(t => t.id === savedTaxo)
            ? savedTaxo
            : data[0].id;
          setActiveTaxonomyId(prev => prev || nextTaxonomyId);
        }
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Failed to load taxonomies registry:', err);
      });
    return () => controller.abort();
  }, []);

  return { availableTaxonomies, activeTaxonomyId, setActiveTaxonomyId };
}
