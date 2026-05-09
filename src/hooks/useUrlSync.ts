import { useEffect, useRef } from 'react';
import type { TreeNode } from '../types';
import { findNodePath } from '../utils/treeUtils';
import { safeLocalStorageSet } from '../utils/storage';

export function useUrlSync(
  activeId: string,
  activeTaxonomyId: string,
  data: TreeNode | null,
  setExpanded: (setter: React.SetStateAction<Set<string>>) => void,
  setActiveId: (id: string) => void,
  setForceCenterOnActive: (v: boolean) => void
) {
  const isInitialMount = useRef(true);

  // Sync activeTaxonomyId to URL and localStorage
  useEffect(() => {
    if (activeTaxonomyId) {
      safeLocalStorageSet('selma_activeTaxonomyId', activeTaxonomyId);
      const url = new URL(window.location.href);
      if (url.searchParams.get('taxonomy') !== activeTaxonomyId) {
        url.searchParams.set('taxonomy', activeTaxonomyId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [activeTaxonomyId]);

  // Initial node from URL
  useEffect(() => {
    if (data) {
      setExpanded(prev => {
        const next = new Set(prev);
        next.add(data.id);

        const p = new URLSearchParams(window.location.search);
        const initialNodeId = p.get('node');
        
        if (initialNodeId) {
          const path = findNodePath(data, initialNodeId)?.map(n => n.id);
          if (path) {
            path.forEach(id => next.add(id));
            if (isInitialMount.current) {
              setActiveId(initialNodeId);
            }
          }
        }
        return next;
      });
      isInitialMount.current = false;
    }
  }, [data, setExpanded, setActiveId]);

  // Sync activeId to URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const currentNode = url.searchParams.get('node');

    if (!activeId) {
      if (currentNode !== null) {
        url.searchParams.delete('node');
        window.history.pushState({}, '', url.toString());
      }
      return;
    }

    if (currentNode !== activeId) {
      url.searchParams.set('node', activeId);
      window.history.pushState({ nodeId: activeId }, '', url.toString());
    }
  }, [activeId]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const nodeId = p.get('node');
      if (nodeId && data) {
         const path = findNodePath(data, nodeId)?.map(n => n.id);
         if (path) {
           setExpanded(() => new Set(path));
           setActiveId(nodeId);
           setForceCenterOnActive(true);
         }
      } else if (data) {
        setExpanded(() => new Set([data.id]));
        setActiveId('');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [data, setExpanded, setActiveId, setForceCenterOnActive]);
}