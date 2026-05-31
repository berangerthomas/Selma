/** Builds a case-insensitive highlight regex from a user query string. */
export function buildHighlightRegex(query: string): RegExp {
  return new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );
}

// Type alias matching the t() signature returned by react-i18next
export type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Tests whether a node matches a search query.
 * Matches on the node's id, its localized name, or its tags.
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

export function splitByHighlight(text: string, query: string): { text: string; isMatch: boolean }[] {
  if (!query.trim()) return [{ text, isMatch: false }]
  const regex = buildHighlightRegex(query)
  if (!regex) return [{ text, isMatch: false }]
  const parts: { text: string; isMatch: boolean }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isMatch: false })
    }
    parts.push({ text: match[0], isMatch: true })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false })
  }
  return parts
}
