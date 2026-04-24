import type { TreeNode } from '../types';

/**
 * Perform a Depth-First Search to find all node IDs that match a given query.
 * Matches against node id or node name (localized via `t` when available).
 */
export function findAllPathsByQuery(
  root: TreeNode,
  query: string,
  t?: (key: string, opts?: any) => string,
  mode: 'simple' | 'full' = 'full'
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: string[] = [];
  function dfs(node: TreeNode): void {
    const idMatch = node.id?.toLowerCase().includes(q);
    const translatedName = t ? t(`nodes.${node.id}.name`, { defaultValue: node.name }) : node.name;
    const nameMatch = translatedName?.toLowerCase().includes(q);

    const matched = idMatch || nameMatch;

    if (matched) {
      results.push(node.id);
    }
    if (node.children) {
      node.children.forEach((c) => dfs(c));
    }
  }
  dfs(root);
  return results;
}

/**
 * Return an array of TreeNodes representing the full node path from root to the target node ID.
 * Useful for building breadcrumbs or resolving node IDs.
 */
export function findNodePath(root: TreeNode, targetId: string): TreeNode[] | null {
  if (root.id === targetId) return [root];
  if (!root.children) return null;
  for (const child of root.children) {
    const sub = findNodePath(child, targetId);
    if (sub) return [root, ...sub];
  }
  return null;
}

/**
 * Find and return a specific TreeNode by its ID.
 */
export function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const res = findNodeById(c, id);
    if (res) return res;
  }
  return null;
}

/**
 * Return the inherited color for a node by walking up from the node to the root.
 * Falls back to '#6b7280' if no ancestor has a color.
 */
export function getInheritedColor(nodeId: string, root: TreeNode): string {
  const path = findNodePath(root, nodeId);
  if (!path) return '#6b7280';
  for (let i = path.length - 1; i >= 0; i--) {
    const color = path[i].color;
    if (color) return color;
  }
  return '#6b7280';
}

/**
 * Export a tree as an indented text representation using box-drawing characters.
 */
export function exportTreeAsText(
  node: TreeNode,
  t?: (key: string, opts?: any) => string,
  prefix: string = '',
  isLast: boolean = true
): string {
  const displayName = t ? t(`nodes.${node.id}.name`, { defaultValue: node.name }) : (node.name || node.id);
  const connector = prefix === '' ? '' : (isLast ? '└── ' : '├── ');
  let result = prefix + connector + displayName + '\n';

  if (node.children && node.children.length > 0) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      result += exportTreeAsText(child, t, childPrefix, childIsLast);
    });
  }

  return result;
}
