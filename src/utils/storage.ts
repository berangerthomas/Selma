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
  tagStates: 'selma_tagStates',
  // NOTE: historical inconsistency: most keys use the `selma_` prefix with underscores.
  // `theme` was intentionally left generic for cross-app theming, `textSize` uses a hyphen.
  // Changing these keys may break existing users' preferences.
  theme: 'theme',
  textSize: 'selma-text-size',
  nodeSize: 'selma_nodeSize',
  hSpacing: 'selma_hSpacing',
  vSpacing: 'selma_vSpacing',
  nodeShape: 'selma_nodeShape',
  orientation: 'selma_orientation',
  labelPosition: 'selma_labelPosition',
} as const;

