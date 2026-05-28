export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function safeLocalStorageGet(key: StorageKey): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function safeLocalStorageSet(key: StorageKey, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* silently ignore */ }
}

export const STORAGE_KEYS = {
  viewMode: 'selma_viewMode',
  activeTaxonomyId: 'selma_activeTaxonomyId',
  tagStates: 'selma_tagStates',
  // NOTE: historical inconsistency: most keys use the `selma_` prefix with underscores.
  // `theme` was intentionally left generic for cross-app theming. `textSize` uses
  // a hyphen (`selma-text-size`) on purpose for backward compatibility —
  // changing these keys will break existing users' preferences.
  theme: 'theme',
  textSize: 'selma-text-size',
  nodeSize: 'selma_nodeSize',
  hSpacing: 'selma_hSpacing',
  vSpacing: 'selma_vSpacing',
  nodeShape: 'selma_nodeShape',
  orientation: 'selma_orientation',
  labelPosition: 'selma_labelPosition',
} as const;

