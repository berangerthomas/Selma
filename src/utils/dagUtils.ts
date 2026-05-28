import type { DagData, DagNode, CrossEdge, TreeNode, TagStates } from '../types';
import { FALLBACK_COLOR } from '../types';
import { nodeMatchesQuery, type TranslateFn } from './searchRegex';

/**
 * Build spanning tree (nested TreeNode) from DagData via BFS.
 * Primary parent = first to claim a node in BFS order.
 * Additional parent→child relationships become crossEdges.
 * Propagates tags and metadata to TreeNode.
 */
export function buildSpanningTree(data: DagData): { tree: TreeNode; crossEdges: CrossEdge[] } {
  const claimed = new Set<string>();
  const crossEdges: CrossEdge[] = [];

  function resolve(id: string): TreeNode {
    const dag = data.nodes[id];
    if (!dag) throw new Error(`dagUtils: node "${id}" not found`);
    const resolvedChildren: TreeNode[] = [];
    for (const childId of dag.children ?? []) {
      if (claimed.has(childId)) {
        crossEdges.push({ parentId: id, childId });
      } else {
        claimed.add(childId);
        resolvedChildren.push(resolve(childId));
      }
    }
    const node: TreeNode = {
      id: dag.id,
      name: dag.name,
      ...(dag.color       && { color:       dag.color }),
      ...(dag.image       && { image:       dag.image }),
      ...(dag.iconChar    && { iconChar:    dag.iconChar, iconFont: dag.iconFont }),
      ...(dag.attachments && { attachments: dag.attachments }),
      ...(dag.tags        && { tags:        dag.tags }),
      ...(dag.metadata    && { metadata:    dag.metadata }),
    };
    if (resolvedChildren.length > 0) node.children = resolvedChildren;
    return node;
  }

  claimed.add(data.root);
  return { tree: resolve(data.root), crossEdges };
}

export function getAllDagNodeIds(data: DagData): string[] {
  return Object.keys(data.nodes);
}

/**
 * Build a reverse map of child → parents for O(1) lookups.
 */
export function buildParentMap(data: DagData): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of Object.values(data.nodes)) {
    for (const childId of node.children ?? []) {
      if (!map.has(childId)) map.set(childId, []);
      map.get(childId)!.push(node.id);
    }
  }
  return map;
}

/** All direct parents of a node (may be multiple in a DAG). */
export function getParents(data: DagData, nodeId: string, parentMap?: Map<string, string[]>): string[] {
  if (parentMap) {
    return parentMap.get(nodeId) ?? [];
  }
  return Object.values(data.nodes)
    .filter(n => n.children?.includes(nodeId))
    .map(n => n.id);
}

export function hasMultipleParents(data: DagData, nodeId: string, parentMap?: Map<string, string[]>): boolean {
  return getParents(data, nodeId, parentMap).length > 1;
}

/** Text search: returns IDs matching query by id or translated name. */
export function findMatchingIds(
  data: DagData,
  query: string,
  t?: TranslateFn
): string[] {
  if (!query.trim()) return [];
  return Object.values(data.nodes)
    .filter(node => nodeMatchesQuery(node.id, node.name, query, t, node.tags))
    .map(n => n.id);
}

/** Climb toward root via first available parent path to resolve inherited color. */
export function getInheritedColorDag(data: DagData, nodeId: string, parentMap?: Map<string, string[]>): string {
  const visited = new Set<string>();
  function climb(id: string): string | null {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = data.nodes[id];
    if (!node) return null;
    if (node.color) return node.color;
    for (const parentId of getParents(data, id, parentMap)) {
      const c = climb(parentId);
      if (c) return c;
    }
    return null;
  }
  return climb(nodeId) ?? FALLBACK_COLOR;
}

/** Cycle detection — must run at load time. Throws if a cycle is found. */
export function hasCycle(data: DagData): boolean {
  const visited = new Set<string>();
  const stack = new Set<string>();
  function dfs(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id); stack.add(id);
    for (const childId of data.nodes[id]?.children ?? []) {
      if (dfs(childId)) return true;
    }
    stack.delete(id);
    return false;
  }
  return Object.keys(data.nodes).some(id => !visited.has(id) && dfs(id));
}

export function getAllTags(data: DagData): string[] {
  const tags = new Set<string>();
  for (const node of Object.values(data.nodes)) {
    if (node.tags) {
      node.tags.forEach(t => tags.add(t));
    }
  }
  return Array.from(tags).sort();
}

/**
 * Filter the DAG to keep only nodes that match the selected tags according to the chosen mode,
 * and their ancestors (to maintain the tree structure).
 */
export function filterDagByTags(data: DagData, tagStates: TagStates): DagData {
  const includeTags = Object.keys(tagStates).filter(tag => tagStates[tag] === 'include');
  const excludeTags = Object.keys(tagStates).filter(tag => tagStates[tag] === 'exclude');

  if (includeTags.length === 0 && excludeTags.length === 0) return data;

  const keep = new Set<string>();
  const memo = new Map<string, boolean>();

  function dfs(id: string): boolean {
    if (memo.has(id)) return memo.get(id)!;
    
    // Temporarily set to false to handle potential DAG loops
    memo.set(id, false);

    const node = data.nodes[id];
    if (!node) return false;

    const nodeTags = node.tags ?? [];
    const hasTags = nodeTags.length > 0;
    
    // Check if node is rejected by any exclude tag
    const isExcluded = excludeTags.some(tag => 
      tag === '__untagged__' ? !hasTags : nodeTags.includes(tag)
    );

    let matches = false;

    if (!isExcluded) {
      if (includeTags.length === 0) {
        // No include tags, and not excluded -> keep
        matches = true;
      } else {
        // Must match AT LEAST ONE include tag (OR logic)
        matches = includeTags.some(tag => 
          tag === '__untagged__' ? !hasTags : nodeTags.includes(tag)
        );
      }
    }

    // Traverse children to keep ancestors of matching nodes
    for (const childId of node.children ?? []) {
      if (dfs(childId)) {
        matches = true;
      }
    }

    memo.set(id, matches);
    if (matches) keep.add(id);
    return matches;
  }

  dfs(data.root);

  // Warn in development if the DAG contains cycles — this can cause
  // the temporary `memo.set(id, false)` trick to silently drop nodes.
  if (import.meta.env.DEV) {
    try {
      if (hasCycle(data)) {
        // eslint-disable-next-line no-console
        console.warn('filterDagByTags: input DagData contains cycles — filter results may be incomplete');
      }
    } catch (e) {
      // ignore
    }
  }

  keep.add(data.root);

  const newNodes: Record<string, DagNode> = {};
  for (const id of keep) {
    const original = data.nodes[id];
    newNodes[id] = {
      ...original,
      children: (original.children ?? []).filter(c => keep.has(c))
    };
  }

  return {
    root: data.root,
    nodes: newNodes
  };
}

/**
 * Return the set of ancestor ids (including the target) by climbing parents.
 */
export function findAllDagAncestors(dagData: DagData, targetId: string): string[] {
  const result = new Set<string>();
  const visited = new Set<string>();
  function climb(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    result.add(id);
    const parents = getParents(dagData, id);
    for (const p of parents) climb(p);
  }
  climb(targetId);
  return Array.from(result);
}
