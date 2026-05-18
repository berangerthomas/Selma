import { useEffect, useRef } from 'react';
import type { TreeNode } from '../types';
import { safeLocalStorageSet, STORAGE_KEYS } from '../utils/storage';

export function hasInitialNodeParam(search: string): boolean {
  return new URLSearchParams(search).has('node');
}

export function syncTaxonomyInUrl(currentHref: string, activeTaxonomyId: string): string {
  const url = new URL(currentHref);
  if (url.searchParams.get('taxonomy') !== activeTaxonomyId) {
    url.searchParams.set('taxonomy', activeTaxonomyId);
  }
  return url.toString();
}

export function syncNodeInUrl(
  currentHref: string,
  activeId: string,
  isNavigatingHistory: boolean = false
): { href: string; method: 'none' | 'push' | 'replace' } {
  const url = new URL(currentHref);
  const currentNode = url.searchParams.get('node');

  if (!activeId) {
    if (currentNode === null) {
      return { href: currentHref, method: 'none' };
    }

    url.searchParams.delete('node');
    return { href: url.toString(), method: 'push' };
  }

  if (currentNode === activeId) {
    return { href: currentHref, method: 'none' };
  }

  url.searchParams.set('node', activeId);
  return {
    href: url.toString(),
    method: isNavigatingHistory ? 'replace' : 'push',
  };
}

export function getNodeIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get('node');
}

export function useUrlSync(
  activeId: string,
  activeTaxonomyId: string,
  data: TreeNode | null,
  setExpanded: (setter: React.SetStateAction<Set<string>>) => void,
  setActiveId: (id: string) => void,
  navigateToResult: (nodeId: string, forceCenter?: boolean) => void,
  isNavigatingHistory?: { readonly current: boolean }
) {
  const isInitialMount = useRef(true);
  const suppressEmptyActiveIdSync = useRef(
    hasInitialNodeParam(window.location.search)
  );

  // Sync activeTaxonomyId to URL and localStorage
  useEffect(() => {
    if (activeTaxonomyId) {
      safeLocalStorageSet(STORAGE_KEYS.activeTaxonomyId, activeTaxonomyId);
      const nextHref = syncTaxonomyInUrl(window.location.href, activeTaxonomyId);
      if (nextHref !== window.location.href) {
        window.history.replaceState({}, '', nextHref);
      }
    }
  }, [activeTaxonomyId]);

  // Initial node from URL
  useEffect(() => {
    if (data) {
      const initialNodeId = new URLSearchParams(window.location.search).get('node');

      setExpanded(prev => {
        const next = new Set(prev);
        next.add(data.id);
        return next;
      });

      if (initialNodeId && isInitialMount.current) {
        navigateToResult(initialNodeId, false);
      }
      isInitialMount.current = false;
    }
  }, [data, setExpanded, navigateToResult]);

  useEffect(() => {
    if (activeId) {
      suppressEmptyActiveIdSync.current = false;
    }
  }, [activeId]);

  // Sync activeId to URL — use replaceState when navigating history to avoid duplicate entries
  useEffect(() => {
    if (suppressEmptyActiveIdSync.current && !activeId) {
      return;
    }

    const next = syncNodeInUrl(window.location.href, activeId, isNavigatingHistory?.current);

    if (next.method === 'none') {
      return;
    }

    if (next.method === 'replace') {
      window.history.replaceState({ nodeId: activeId }, '', next.href);
    } else {
      window.history.pushState({ nodeId: activeId }, '', next.href);
    }
  }, [activeId, isNavigatingHistory]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const nodeId = getNodeIdFromSearch(window.location.search);
      if (nodeId && data) {
        navigateToResult(nodeId, true);
      } else if (data) {
        setExpanded(() => new Set([data.id]));
        setActiveId('');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [data, setExpanded, setActiveId, navigateToResult]);
}