const markdownCache = new Map<string, string>();

export async function fetchMarkdownContent(
  lang: string,
  nodeId: string,
  signal?: AbortSignal
): Promise<string | null> {
  const cacheKey = `${lang}|${nodeId}`;
  if (markdownCache.has(cacheKey)) return markdownCache.get(cacheKey)!;

  const paths = [`/details/${lang}/${nodeId}.md`, `/details/${nodeId}.md`];
  for (const path of paths) {
    try {
      const res = await fetch(path, signal ? { signal } : {});
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) continue; // SPA fallback, not real content
      const text = await res.text();
      markdownCache.set(cacheKey, text);
      return text;
    } catch {
      // network error or abort — continue to next path or return null
    }
  }
  return null;
}

export function clearMarkdownCache(): void {
  markdownCache.clear();
}