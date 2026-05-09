import { useCallback } from 'react'
import type { TreeNode } from '../types'
import { findAllPathsByQuery, getAllNodeIds } from '../utils/treeUtils'
import { fetchMarkdownContent } from '../utils/fetchMarkdown'

export function useDeepSearch(
  data: TreeNode | null,
  lang: string,
  t: (key: string, opts?: any) => string,
  searchContentCacheRef: React.MutableRefObject<Map<string, string>>
) {
  const performDeepSearch = useCallback(async (query: string): Promise<string[]> => {
    if (!data || !query.trim()) return []

    const q = query.toLowerCase()
    const resultsSet = new Set<string>()

    try {
      const simpleMatches = findAllPathsByQuery(data, query, t)
      simpleMatches.forEach((id) => resultsSet.add(id))
    } catch (e) {
      // ignore
    }

    const allIds = getAllNodeIds(data)
    const BATCH_SIZE = 15

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(async (id) => {
        try {
          const cacheKey = `${lang || 'default'}|${id}`
          if (searchContentCacheRef.current.has(cacheKey)) {
            const cached = searchContentCacheRef.current.get(cacheKey) || ''
            if (cached.toLowerCase().includes(q)) resultsSet.add(id)
            return
          }

          const mdContent = await fetchMarkdownContent(lang, id)
          if (mdContent !== null) {
            searchContentCacheRef.current.set(cacheKey, mdContent)
            if (mdContent.toLowerCase().includes(q)) resultsSet.add(id)
          }
        } catch (err) {
          // ignore
        }
      }))
    }

    return Array.from(resultsSet)
  }, [data, lang, t, searchContentCacheRef])

  return { performDeepSearch }
}