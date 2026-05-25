import type { TreeNode, DagData } from '../types';
import { FALLBACK_COLOR } from '../types';
import { hasMultipleParents } from './dagUtils';
import { nodeMatchesQuery, type TranslateFn } from './searchRegex';

export function getAllNodeIds(root: TreeNode): string[] {
  const ids: string[] = [];
  function walk(node: TreeNode) {
    ids.push(node.id);
    node.children?.forEach(walk);
  }
  walk(root);
  return ids;
}

/**
 * Perform a Depth-First Search to find all node IDs that match a given query.
 * Matches against node id or node name (localized via `t` when available).
 */
export function findAllPathsByQuery(
  root: TreeNode,
  query: string,
  t?: TranslateFn
): string[] {
  if (!query.trim()) return [];

  const results: string[] = [];
  function dfs(node: TreeNode): void {
    if (nodeMatchesQuery(node.id, node.name, query, t, node.tags)) {
      results.push(node.id);
    }
    if (node.children) {
      node.children.forEach((c) => dfs(c));
    }
  }
  dfs(root);
  return results;
}

const pathIndexCache = new WeakMap<TreeNode, Map<string, TreeNode[]>>();

function buildPathIndex(root: TreeNode): Map<string, TreeNode[]> {
  let index = pathIndexCache.get(root);
  if (index) return index;

  index = new Map<string, TreeNode[]>();
  function walk(n: TreeNode, currentPath: TreeNode[]) {
    const newPath = [...currentPath, n];
    if (!index!.has(n.id)) {
      index!.set(n.id, newPath);
    }
    if (n.children) {
      for (const c of n.children) {
        walk(c, newPath);
      }
    }
  }
  walk(root, []);
  pathIndexCache.set(root, index);
  return index;
}

/**
 * Return an array of TreeNodes representing the full node path from root to the target node ID.
 * Useful for building breadcrumbs or resolving node IDs.
 */
export function findNodePath(root: TreeNode, targetId: string): TreeNode[] | null {
  return buildPathIndex(root).get(targetId) || null;
}

export function findNodePathIds(root: TreeNode, targetId: string): string[] | null {
  return findNodePath(root, targetId)?.map(n => n.id) ?? null
}

const nodeIndexCache = new WeakMap<TreeNode, Map<string, TreeNode>>();

function buildNodeIndex(root: TreeNode): Map<string, TreeNode> {
  let index = nodeIndexCache.get(root);
  if (index) return index;

  index = new Map<string, TreeNode>();
  function walk(n: TreeNode) {
    if (!index!.has(n.id)) {
      index!.set(n.id, n);
    }
    if (n.children) {
      for (const c of n.children) {
        walk(c);
      }
    }
  }
  walk(root);
  nodeIndexCache.set(root, index);
  return index;
}

/**
 * Find and return a specific TreeNode by its ID.
 */
export function findNodeById(root: TreeNode, id: string): TreeNode | null {
  return buildNodeIndex(root).get(id) || null;
}

/**
 * Return the inherited color for a node by walking up from the node to the root.
 * Falls back to '#6b7280' if no ancestor has a color.
 */
export function getInheritedColor(nodeId: string, root: TreeNode): string {
  const path = findNodePath(root, nodeId);
  if (!path) return FALLBACK_COLOR;
  for (let i = path.length - 1; i >= 0; i--) {
    const color = path[i].color;
    if (color) return color;
  }
  return FALLBACK_COLOR;
}

/**
 * Export a tree as an indented text representation using box-drawing characters.
 */
export function exportTreeAsText(
  node: TreeNode,
  t?: TranslateFn,
  prefix: string = '',
  isLast: boolean = true,
  dagData?: DagData
): string {
  const displayName = t ? t(`nodes.${node.id}.name`, { defaultValue: node.name }) : (node.name || node.id);
  const connector = prefix === '' ? '' : (isLast ? '└── ' : '├── ');
  const multiMark = dagData && hasMultipleParents(dagData, node.id) ? ' ⬡' : '';
  let result = prefix + connector + displayName + multiMark + '\n';

  if (node.children && node.children.length > 0) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      result += exportTreeAsText(child, t, childPrefix, childIsLast, dagData);
    });
  }

  return result;
}
