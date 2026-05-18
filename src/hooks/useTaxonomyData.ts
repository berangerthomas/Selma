import { useState, useEffect } from 'react'
import type { DagData } from '../types'
import { hasCycle } from '../utils/dagUtils'

export type TaxoFile = {
  root?: string;
  nodes: Record<string, { children?: string[] }>;
};

/**
 * Build a DagData object from the taxonomy file and nodes registry.
 * Throws on invalid format or when the resulting graph contains a cycle.
 */
export function buildDagDataFromFiles(taxoFile: TaxoFile, nodesDict: Record<string, any>): DagData {
  const allIds = new Set<string>();
  for (const [id, structNode] of Object.entries(taxoFile.nodes)) {
    allIds.add(id);
    const struct = structNode as { children?: string[] };
    for (const childId of struct.children ?? []) {
      allIds.add(childId);
    }
  }

  const dagData: DagData = {
    root: taxoFile.root as string,
    nodes: {}
  };

  for (const id of allIds) {
    const taxoNode = taxoFile.nodes[id] as { children?: string[] } | undefined;
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
    throw new Error('Taxonomy contains a cycle — DAG must be acyclic.');
  }

  return dagData;
}

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

        // Fetch nodes definitions (cached at module level since it's static data)
        if (cachedNodesDict === null) {
          try {
            const nodesResponse = await fetch('/data/nodes.json')
            if (nodesResponse.ok) {
              cachedNodesDict = await nodesResponse.json()
            } else {
              console.warn('nodes.json not found.')
              // cachedNodesDict stays null — will retry on next taxonomy switch
            }
          } catch (e) {
            console.warn('Failed to fetch nodes.json.', e)
            // cachedNodesDict stays null — will retry on next taxonomy switch
          }
        }
        // If still null after fetch attempt, we cannot resolve node metadata
        const nodesDict: Record<string, unknown> = cachedNodesDict ?? {};

        // Fetch taxonomy structure
        const taxoResponse = await fetch(`/data/taxonomies/${taxonomyId}.json`)
        if (!taxoResponse.ok) throw new Error(`HTTP error! status: ${taxoResponse.status}`)
        const taxoFile = await taxoResponse.json()

            const dagData = buildDagDataFromFiles(taxoFile as TaxoFile, nodesDict);

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