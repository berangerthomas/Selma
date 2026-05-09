import { useState, useEffect } from 'react'
import type { DagData } from '../types'
import { hasCycle } from '../utils/dagUtils'

export function useTaxonomyData(taxonomyId: string) {
  const [data, setData] = useState<DagData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!taxonomyId) return;

    let mounted = true
    async function fetchData() {
      try {
        setLoading(true)
        
        // Fetch nodes definitions
        const nodesResponse = await fetch('/data/nodes.json')
        if (!nodesResponse.ok) throw new Error(`HTTP error! status: ${nodesResponse.status}`)
        const nodesDict = await nodesResponse.json()

        // Fetch taxonomy structure
        const taxoResponse = await fetch(`/data/taxonomies/${taxonomyId}.json`)
        if (!taxoResponse.ok) throw new Error(`HTTP error! status: ${taxoResponse.status}`)
        const taxoFile = await taxoResponse.json()

        // Merge them into a single DagData
        const dagData: DagData = {
          root: taxoFile.root,
          nodes: {}
        };

        for (const [id, structNode] of Object.entries(taxoFile.nodes)) {
          const detailNode = nodesDict[id] || {};
          dagData.nodes[id] = {
            id,
            children: (structNode as any).children || [],
            ...detailNode
          };
        }

        if (!dagData.root || !dagData.nodes) {
          throw new Error('Invalid taxonomy format. Expected DAG format with "root" and "nodes".');
        }

        if (hasCycle(dagData)) {
          throw new Error(`Taxonomy "${taxonomyId}" contains a cycle — DAG must be acyclic.`);
        }

        if (mounted) {
          setData(dagData)
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
  }, [taxonomyId])

  return { data, loading, error }
}
