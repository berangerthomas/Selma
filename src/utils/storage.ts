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
  // NOTE: historical inconsistency: most keys use the `selma_` prefix with underscores,
  // but `theme` was intentionally left generic to allow easy cross-app theming.
  // Another inconsistency is `textSize` which uses a hyphen (`selma-text-size`).
  // Changing these keys may break existing users' preferences; perform a one-off
  // migration if desired and call `migrateThemeKeyToSelma()` in a migration step.
  theme: 'theme',
  textSize: 'selma-text-size',
  nodeSize: 'selma_nodeSize',
  hSpacing: 'selma_hSpacing',
  vSpacing: 'selma_vSpacing',
  nodeShape: 'selma_nodeShape',
  orientation: 'selma_orientation',
} as const;

// Helper: in case the team decides to adopt `selma_theme`, call this function once
// during a migration step (DEV/upgrade script). It will copy the existing `theme`
// value into `selma_theme` if present and if the destination key is empty.
export function migrateThemeKeyToSelma() {
  try {
    const old = safeLocalStorageGet('theme');
    const dst = safeLocalStorageGet('selma_theme');
    if (old !== null && dst === null) {
      safeLocalStorageSet('selma_theme', old);
    }
  } catch {
    // ignore
  }
}
