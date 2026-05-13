import type { DagData, DagNode, CrossEdge, TreeNode } from '../types';
import * as d3 from 'd3'
import { nodeMatchesQuery, type TranslateFn } from './searchRegex';

// Prune tree -> produce a D3 hierarchy suitable for layout (adds optional cluster nodes)
export function buildPrunedHierarchy(root: TreeNode, expanded: Set<string> | null) {
  type PrunedNode = Omit<TreeNode, 'children'> & { __cluster_for?: string; __cluster_count?: number; children?: PrunedNode[] }

  function totalCount(n: TreeNode): number {
    if (!n || !n.children || n.children.length === 0) return 0
    return n.children.length
  }

  function prune(node: TreeNode, depth = 0): PrunedNode | null {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    const base: PrunedNode = { id: node.id, name: node.name }
    if (node.color) base.color = node.color
    if (node.image) base.image = node.image
    if (node.attachments) base.attachments = node.attachments
    if (node.iconChar) {
      base.iconChar = node.iconChar
      base.iconFont = node.iconFont
    }

    if (!hasChildren) return base

    if (depth >= 1 && !(expanded && expanded.has(node.id))) {
      const count = totalCount(node)
      const cluster: PrunedNode = { id: `${node.id}__cluster`, name: '', __cluster_for: node.id, __cluster_count: count }
      return { ...base, children: [cluster] }
    }

    const children = (node.children || []).map((c: TreeNode) => prune(c, depth + 1)).filter((c): c is PrunedNode => c !== null)
    if (children.length === 0) return base
    return { ...base, children }
  }

  const pruned = prune(root, 0)
  return d3.hierarchy(pruned as PrunedNode)
}

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

export function getDagNode(data: DagData, id: string): DagNode | null {
  return data.nodes[id] ?? null;
}

export function getAllDagNodeIds(data: DagData): string[] {
  return Object.keys(data.nodes);
}

/** All direct parents of a node (may be multiple in a DAG). */
export function getParents(data: DagData, nodeId: string): string[] {
  return Object.values(data.nodes)
    .filter(n => n.children?.includes(nodeId))
    .map(n => n.id);
}

export function hasMultipleParents(data: DagData, nodeId: string): boolean {
  return getParents(data, nodeId).length > 1;
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
export function getInheritedColorDag(data: DagData, nodeId: string): string {
  const visited = new Set<string>();
  function climb(id: string): string | null {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = data.nodes[id];
    if (!node) return null;
    if (node.color) return node.color;
    for (const parentId of getParents(data, id)) {
      const c = climb(parentId);
      if (c) return c;
    }
    return null;
  }
  return climb(nodeId) ?? '#6b7280';
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

/**
 * Find a path from root to targetId in the DAG.
 * If preferredParentId is provided and the target has multiple parents,
 * prefer the path that goes through preferredParentId.
 */
export function findDagPath(
  data: DagData,
  rootId: string,
  targetId: string,
  preferredParentId: string | null = null
): DagNode[] {
  const visited = new Set<string>();
  let preferredResult: DagNode[] | null = null;
  let firstResult: DagNode[] | null = null;

  function dfs(id: string, path: DagNode[]): boolean {
    if (visited.has(id)) return false;
    visited.add(id);
    const node = data.nodes[id];
    if (!node) return false;
    const newPath = [...path, node];
    if (id === targetId) {
      if (firstResult === null) firstResult = newPath;
      // Check if this path goes through the preferred parent
      if (preferredParentId && newPath.some(n => n.id === preferredParentId)) {
        preferredResult = newPath;
        return true; // stop at first preferred match
      }
      return false; // keep searching for preferred path
    }
    for (const childId of node.children ?? []) {
      if (dfs(childId, newPath)) return true;
    }
    return false;
  }

  dfs(rootId, []);
  return preferredResult ?? firstResult ?? [];
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
 * Filter the DAG to keep only nodes that have at least one of the selected tags,
 * and their ancestors (to maintain the tree structure).
 */
export function filterDagByTags(data: DagData, selectedTags: string[]): DagData | null {
  if (!selectedTags || selectedTags.length === 0) return data;

  const tagSet = new Set(selectedTags);
  const keep = new Set<string>();
  const memo = new Map<string, boolean>();

  function dfs(id: string): boolean {
    if (memo.has(id)) return memo.get(id)!;
    
    // Temporarily set to false to handle potential DAG loops
    memo.set(id, false);

    const node = data.nodes[id];
    if (!node) return false;

    let matches = false;
    if (node.tags && node.tags.some(t => tagSet.has(t))) {
      matches = true;
    }

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

  if (!keep.has(data.root)) return null;

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