import { useState, useEffect } from 'react'
import type { DagData } from '../types'
import { hasCycle } from '../utils/dagUtils'

interface TaxoStructNode {
  children?: string[];
}

let cachedNodesDict: Record<string, unknown> | null = null;

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
        
        // Fetch nodes definitions (cached at module level since it's static)
        if (!cachedNodesDict) {
          const nodesResponse = await fetch('/data/nodes.json')
          if (!nodesResponse.ok) throw new Error(`HTTP error! status: ${nodesResponse.status}`)
          cachedNodesDict = await nodesResponse.json()
        }
        const nodesDict: Record<string, unknown> = cachedNodesDict!;

        // Fetch taxonomy structure
        const taxoResponse = await fetch(`/data/taxonomies/${taxonomyId}.json`)
        if (!taxoResponse.ok) throw new Error(`HTTP error! status: ${taxoResponse.status}`)
        const taxoFile = await taxoResponse.json()

        // Collect all IDs: declared keys + every child referenced in children[]
        const allIds = new Set<string>();
        for (const [id, structNode] of Object.entries(taxoFile.nodes)) {
          allIds.add(id);
          const struct = structNode as TaxoStructNode;
          for (const childId of struct.children ?? []) {
            allIds.add(childId);
          }
        }

        // Resolve every ID in one pass: declared nodes keep their children,
        // unreferenced leaf nodes get [] and are enriched from nodes.json.
        const dagData: DagData = {
          root: taxoFile.root,
          nodes: {}
        };
        for (const id of allIds) {
          const taxoNode = taxoFile.nodes[id] as TaxoStructNode | undefined;
          const detailNode = (nodesDict[id] || {}) as Record<string, unknown>;
          dagData.nodes[id] = {
            id,
            name: (detailNode.name as string) || id,
            children: taxoNode?.children ?? [],
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
