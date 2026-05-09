/** Construit une regex d'highlight case-insensitive à partir d'une requête utilisateur. */
export function buildHighlightRegex(query: string): RegExp {
  return new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );
}

/**
 * Teste si un nœud correspond à une requête de recherche.
 * Match sur l'id ou le nom localisé du nœud.
 */
export function nodeMatchesQuery(
  id: string,
  name: string,
  query: string,
  t?: (key: string, opts?: unknown) => string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const displayName = t ? t(`nodes.${id}.name`, { defaultValue: name }) : name;
  return id.toLowerCase().includes(q) || displayName?.toLowerCase().includes(q);
}