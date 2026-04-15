import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TreeNode } from '../types';
import { findAllPathsByQuery, findNodePath } from '../utils/treeUtils';
import { useTaxonomyData } from '../hooks/useTaxonomyData';
import { useI18n } from '../i18n';

interface TreeContextType {
  data: TreeNode;
  expanded: Set<string>;
  activeId: string;
  searchResults: string[];
  currentResultIndex: number;
  forceCenterOnActive: boolean;
  isFullyExpanded: boolean;
  toggleNode: (id: string) => void;
  setExpandedToPath: (pathIds: string[]) => void;
  collapseAll: () => void;
  expandAll: () => void;
  handleSearch: (query: string) => void;
  goToNextResult: () => void;
  goToPrevResult: () => void;
  setActiveId: (id: string) => void;
  clearForceCenter: () => void;
  requestForceCenter: () => void;
  resetViewTrigger: number;
  resetView: () => void;
  
  // Custom navigation history
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

export function TreeProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useTaxonomyData();
  const { t, lang } = useI18n();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
  const [forceCenterOnActive, setForceCenterOnActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  // Custom history state
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isNavigatingHistory = useRef(false);

  const isFullyExpanded = useMemo(() => {
    if (!data) return false;

    const allIds: string[] = [];
    const traverse = (node: TreeNode) => {
      allIds.push(node.id);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(data);
    return allIds.every((id) => expanded.has(id));
  }, [data, expanded]);

  useEffect(() => {
    if (data) {
      const p = new URLSearchParams(window.location.search);
      const initialNodeId = p.get('node');
      if (initialNodeId) {
        const path = findNodePath(data, initialNodeId)?.map(n => n.id);
        if (path) {
          setExpanded(new Set(path));
          setActiveId(initialNodeId);
          return;
        }
      }
      setExpanded(new Set([data.id]));
      setActiveId(data.id);
    }
  }, [data]);

  useEffect(() => {
    if (!activeId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('node') !== activeId) {
      url.searchParams.set('node', activeId);
      window.history.pushState({ nodeId: activeId }, '', url.toString());
    }
  }, [activeId]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const p = new URLSearchParams(window.location.search);
      const nodeId = p.get('node');
      if (nodeId && data) {
         const path = findNodePath(data, nodeId)?.map(n => n.id);
         if (path) {
           setExpanded(new Set(path));
           setActiveId(nodeId);
           setForceCenterOnActive(true);
         }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [data]);

  useEffect(() => {
    if (activeId && data) {
      if (isNavigatingHistory.current) {
        isNavigatingHistory.current = false;
        return;
      }
      
      setHistoryStack(prevStack => {
        // Drop any future history if we're branching off from a past point
        const newStack = prevStack.slice(0, historyIndex + 1);
        if (newStack[newStack.length - 1] === activeId) {
          return newStack;
        }
        return [...newStack, activeId];
      });
      setHistoryIndex(prevIndex => prevIndex + 1);
    }
  }, [activeId, data]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack && data) {
      const newIndex = historyIndex - 1;
      const prevId = historyStack[newIndex];
      isNavigatingHistory.current = true;
      setHistoryIndex(newIndex);
      
      const path = findNodePath(data, prevId)?.map(n => n.id);
      if (path) {
        setExpanded(new Set(path));
        setActiveId(prevId);
        setForceCenterOnActive(true);
      }
    }
  }, [canGoBack, historyIndex, historyStack, data]);

  const goForward = useCallback(() => {
    if (canGoForward && data) {
      const newIndex = historyIndex + 1;
      const nextId = historyStack[newIndex];
      isNavigatingHistory.current = true;
      setHistoryIndex(newIndex);
      
      const path = findNodePath(data, nextId)?.map(n => n.id);
      if (path) {
        setExpanded(new Set(path));
        setActiveId(nextId);
        setForceCenterOnActive(true);
      }
    }
  }, [canGoForward, historyIndex, historyStack, data]);

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setExpandedToPath = useCallback((pathIds: string[]) => {
    setExpanded(new Set(pathIds));
    setActiveId(pathIds[pathIds.length - 1]);
  }, []);

  const resetView = useCallback(() => {
    setResetViewTrigger(prev => prev + 1);
  }, []);

  const collapseAll = useCallback(() => {
    if (!data) return;

    // build the set of IDs along the path from root to the active node
    const path = findNodePath(data, activeId || data.id)?.map(n => n.id) ?? [data.id];
    const pathSet = new Set(path);

    // Current status: are there expanded nodes that are NOT on the active path?
    const hasNodesOutsidePath = Array.from(expanded).some(id => !pathSet.has(id));

    if (hasNodesOutsidePath) {
      // Step 1: collapse everything else to isolate only the selected node's branch
      setExpanded(pathSet);
    } else {
      // Step 2 (or if the branch was already the only one open): collapse everything back to the root
      setExpanded(new Set([data.id]));
      // Optional: we can bring the activeId back to the root for a full reset
      setActiveId(data.id);
    }

    resetView();
  }, [data, activeId, expanded, resetView]);

  const expandAll = useCallback(() => {
    if (!data) return;
    const allIds = new Set<string>();
    const traverse = (node: TreeNode) => {
      allIds.add(node.id);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(data);
    setExpanded(allIds);
    resetView();
  }, [data, resetView]);

  const navigateToResult = useCallback((nodeId: string, forceCenter: boolean = true) => {
    if (!data) return;
    const path = findNodePath(data, nodeId)?.map(n => n.id);
    if (path) {
      setExpanded(new Set(path));
      setActiveId(nodeId);
      if (forceCenter) setForceCenterOnActive(true);
    }
  }, [data]);

  const handleSearch = useCallback((query: string) => {
    if (!data) return;
    const trimmed = query.trim();
    setSearchQuery(trimmed);
  }, [data]);

  const prevQueryRef = useRef<string>('');

  useEffect(() => {
    if (!data) return;
    if (!searchQuery) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevQueryRef.current = '';
      return;
    }
    const results = findAllPathsByQuery(data, searchQuery, t);
    if (results.length === 0) {
      console.warn('No node matched search:', searchQuery);
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevQueryRef.current = searchQuery;
      return;
    }

    setSearchResults(results);

    const isNewQuery = prevQueryRef.current !== searchQuery;
    prevQueryRef.current = searchQuery;

    if (!isNewQuery && currentResultIndex >= 0 && searchResults[currentResultIndex]) {
      const activeItem = searchResults[currentResultIndex];
      const newIndex = results.indexOf(activeItem);
      if (newIndex >= 0) {
        setCurrentResultIndex(newIndex);
        return;
      }
    }
    
    // If we land here and it's NOT a new query (e.g. language change),
    // and the user has already navigated away or the result changed,
    // DO NOT force jump back to the first result and steal focus from activeId.
    if (!isNewQuery) {
      setCurrentResultIndex(-1);
      return; 
    }

    setCurrentResultIndex(0);
    navigateToResult(results[0], true);
  }, [searchQuery, lang, data, t, navigateToResult]);

  const goToNextResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    navigateToResult(searchResults[nextIndex]);
  }, [searchResults, currentResultIndex, navigateToResult]);

  const goToPrevResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1;  
    setCurrentResultIndex(prevIndex);
    navigateToResult(searchResults[prevIndex]);
  }, [searchResults, currentResultIndex, navigateToResult]);

  const clearForceCenter = useCallback(() => {
    setForceCenterOnActive(false);
  }, []);

  const requestForceCenter = useCallback(() => {
    setForceCenterOnActive(true);
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>{t('loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'red', fontFamily: 'sans-serif' }}>{t('error', { defaultValue: 'Error:' })} {error.message}</div>;
  }

  if (!data) {
    return null;
  }

  const value = {
    data,
    expanded,
    activeId,
    searchResults,
    currentResultIndex,
    forceCenterOnActive,
    isFullyExpanded,
    toggleNode,
    setExpandedToPath,
    collapseAll,
    expandAll,
    handleSearch,
    goToNextResult,
    goToPrevResult,
    setActiveId,
    clearForceCenter,
    requestForceCenter,
    resetViewTrigger,
    resetView,
    canGoBack,
    canGoForward,
    goBack,
    goForward
  };

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

export function useTree() {
  const context = useContext(TreeContext);
  if (context === undefined) {
    throw new Error('useTree must be used within a TreeProvider');
  }
  return context;
}
