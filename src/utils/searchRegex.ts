/** Construit une regex d'highlight case-insensitive à partir d'une requête utilisateur. */
export function buildHighlightRegex(query: string): RegExp {
  return new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );
}

// Type alias cohérent avec la signature de t() retournée par react-i18next
export type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Teste si un nœud correspond à une requête de recherche.
 * Match sur l'id, le nom localisé du nœud ou ses tags.
 */
export function nodeMatchesQuery(
  id: string,
  name: string,
  query: string,
  t?: TranslateFn,
  tags?: string[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const displayName = t ? t(`nodes.${id}.name`, { defaultValue: name }) : name;
  
  let matches = id.toLowerCase().includes(q) || displayName?.toLowerCase().includes(q);
  
  if (!matches && tags && tags.length > 0) {
    matches = tags.some(tag => {
      const translatedTag = t ? t(`tags.${tag}`, { defaultValue: tag }) : tag;
      return translatedTag.toLowerCase().includes(q);
    });
  }
  
  return matches;
}
