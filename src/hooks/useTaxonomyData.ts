import { useState, useEffect } from 'react'
import type { TreeNode } from '../types'

export function useTaxonomyData() {
  const [data, setData] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch('/structured_taxonomy.json')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const json = await response.json()
        if (mounted) {
          setData(json as TreeNode)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load data'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      mounted = false
    }
  }, [])

  return { data, loading, error }
}
