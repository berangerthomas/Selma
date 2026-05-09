export async function fetchMarkdownContent(
  lang: string,
  nodeId: string,
  signal?: AbortSignal
): Promise<string | null> {
  const paths = [`/details/${lang}/${nodeId}.md`, `/details/${nodeId}.md`];
  for (const path of paths) {
    try {
      const res = await fetch(path, signal ? { signal } : {});
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) continue; // SPA fallback, not real content
      return await res.text();
    } catch {
      // network error or abort — continue to next path or return null
    }
  }
  return null;
}