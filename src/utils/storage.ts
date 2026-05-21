export function safeLocalStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function safeLocalStorageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* silently ignore */ }
}

export const STORAGE_KEYS = {
  viewMode: 'selma_viewMode',
  activeTaxonomyId: 'selma_activeTaxonomyId',
  selectedTags: 'selma_selectedTags',
  tagMatchMode: 'selma_tagMatchMode',
  theme: 'theme',
  textSize: 'selma-text-size',
  nodeSize: 'selma_nodeSize',
  hSpacing: 'selma_hSpacing',
  vSpacing: 'selma_vSpacing',
  nodeShape: 'selma_nodeShape',
} as const;