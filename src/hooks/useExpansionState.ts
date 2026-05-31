import { useCallback, useMemo, useState } from 'react';
import type { DagData, TreeNode } from '../types';
import { findAllDagAncestors, getAllDagNodeIds, hasMultipleParents, getParents, buildParentMap } from '../utils/dagUtils';
import { findNodePathIds } from '../utils/treeUtils';

export function useExpansionState(
  dagData: DagData | null,
  data: TreeNode | null,
  activeId: string,
  setActiveId: (id: string) => void,
  resetView: () => void
) {
  const parentMap = useMemo(() => dagData ? buildParentMap(dagData) : undefined, [dagData]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (dagData) {
          const path = findAllDagAncestors(dagData, id);
          if (path) path.forEach(pid => next.add(pid));
        }
      }
      return next;
    });
  }, [dagData]);

  const setExpandedToPath = useCallback((pathIds: string[]) => {
    setExpanded(new Set(pathIds));
    if (pathIds.length > 0) {
      setActiveId(pathIds[pathIds.length - 1]);
    }
  }, [setActiveId]);

  const collapseAll = useCallback(() => {
    if (!data) return;

    let pathSet: Set<string>;
    if (dagData && activeId && hasMultipleParents(dagData, activeId, parentMap)) {
      pathSet = new Set<string>();
      const parents = getParents(dagData, activeId, parentMap);
      for (const p of parents) {
        const ppath = findNodePathIds(data, p) ?? [];
        ppath.forEach(id => pathSet.add(id));
      }
      pathSet.add(activeId);
    } else {
      const path = findNodePathIds(data, activeId || data.id) ?? [data.id];
      pathSet = new Set(path);
    }

    const hasNodesOutsidePath = Array.from(expanded).some(id => !pathSet.has(id));

    if (hasNodesOutsidePath) {
      setExpanded(pathSet);
    } else {
      setExpanded(new Set([data.id]));
      setActiveId(data.id);
    }

    resetView();
  }, [data, dagData, activeId, expanded, resetView, setActiveId, parentMap]);

  const expandAll = useCallback(() => {
    if (!dagData) return;
    setExpanded(new Set(getAllDagNodeIds(dagData)));
    resetView();
  }, [dagData, resetView]);

  return { expanded, setExpanded, toggleNode, setExpandedToPath, collapseAll, expandAll };
}
