import { useCallback } from 'react'
import type { TreeNode } from '../types'
import { findAllPathsByQuery, getAllNodeIds } from '../utils/treeUtils'
import { fetchMarkdownContent } from '../utils/fetchMarkdown'
import { type TranslateFn } from '../utils/searchRegex'

export function useDeepSearch(
  data: TreeNode | null,
  lang: string,
  t: TranslateFn
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
          const mdContent = await fetchMarkdownContent(lang, id)
          if (mdContent !== null && mdContent.toLowerCase().includes(q)) {
            resultsSet.add(id)
          }
        } catch (err) {
          // ignore
        }
      }))
    }

    return Array.from(resultsSet)
  }, [data, lang, t])

  return { performDeepSearch }
}
