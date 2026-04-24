import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TreeNode, ViewMode } from '../types';
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
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleNode: (id: string) => void;
  setExpandedToPath: (pathIds: string[]) => void;
  collapseAll: () => void;
  expandAll: () => void;
  // mode: 'simple' searches id/name; 'deep' searches markdown content as well
  handleSearch: (query: string, mode?: 'simple' | 'deep') => void;
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

    searchQuery: string;
    activeSearchType: 'simple' | 'deep' | null;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

const centeredFullscreenStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif'
};

export function TreeProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useTaxonomyData();
  const { t, lang } = useI18n();

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('selma_viewMode');
    return (saved as ViewMode) || 'organic';
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('selma_viewMode', mode);
  }, []);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  // cache for fetched markdown content per language+node
  const searchContentCacheRef = useRef<Map<string, string>>(new Map());
  // track whether the current active search comes from simple or deep mode
  const [activeSearchType, setActiveSearchType] = useState<'simple' | 'deep' | null>(null);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
  const [forceCenterOnActive, setForceCenterOnActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  // Custom history state via useReducer to prevent stale closures
  type HistoryState = { stack: string[]; index: number };
  type HistoryAction = 
    | { type: 'PUSH'; id: string }
    | { type: 'GO_BACK' }
    | { type: 'GO_FORWARD' };

  const [history, dispatchHistory] = React.useReducer((state: HistoryState, action: HistoryAction): HistoryState => {
    switch (action.type) {
      case 'PUSH': {
        if (state.stack[state.index] === action.id) return state;
        const newStack = state.stack.slice(0, state.index + 1);
        return { stack: [...newStack, action.id], index: newStack.length };
      }
      case 'GO_BACK':
        return state.index > 0 ? { ...state, index: state.index - 1 } : state;
      case 'GO_FORWARD':
        return state.index < state.stack.length - 1 ? { ...state, index: state.index + 1 } : state;
      default:
        return state;
    }
  }, { stack: [], index: -1 });

  const historyStack = history.stack;
  const historyIndex = history.index;
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
      dispatchHistory({ type: 'PUSH', id: activeId });
    }
  }, [activeId, data]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack && data) {
      const newIndex = historyIndex - 1;
      const prevId = historyStack[newIndex];
      isNavigatingHistory.current = true;
      dispatchHistory({ type: 'GO_BACK' });
      
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
      dispatchHistory({ type: 'GO_FORWARD' });
      
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

  const handleSearch = useCallback((query: string, mode: 'simple' | 'deep' = 'simple') => {
    if (!data) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchQuery('');
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevSearchStateRef.current = { query: '', type: null };
      setActiveSearchType(null);
      return;
    }

    if (mode === 'simple') {
      setActiveSearchType('simple');
      setSearchQuery(trimmed);
      return;
    }

    // deep search: mark active type then perform runtime fetches
    setActiveSearchType('deep');
    setSearchQuery(trimmed);
    (async () => {
      const q = trimmed.toLowerCase();
      const resultsSet = new Set<string>();

      try {
        const simpleMatches = findAllPathsByQuery(data, trimmed, t, 'simple');
        simpleMatches.forEach((id) => resultsSet.add(id));
      } catch (e) {
        // ignore
      }

      // gather all node ids
      const allIds: string[] = [];
      const collect = (n: TreeNode) => {
        allIds.push(n.id);
        if (n.children) n.children.forEach(collect);
      };
      collect(data);

      const BATCH_SIZE = 15;
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batch = allIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (id) => {
          try {
            const cacheKey = `${lang || 'default'}|${id}`;
            if (searchContentCacheRef.current.has(cacheKey)) {
              const cached = searchContentCacheRef.current.get(cacheKey) || '';
              if (cached.toLowerCase().includes(q)) resultsSet.add(id);
              return;
            }

            const candidates = [`/details/${lang}/${id}.md`, `/details/${id}.md`];
            for (const p of candidates) {
              try {
                const res = await fetch(p);
                if (!res.ok) continue;
                const text = await res.text();
                searchContentCacheRef.current.set(cacheKey, text);
                if (text.toLowerCase().includes(q)) resultsSet.add(id);
                break;
              } catch (err) {
                // per-file fetch failed, continue
              }
            }
          } catch (err) {
            // ignore
          }
        }));
      }

      const results = Array.from(resultsSet);
      if (results.length === 0) {
        console.warn('No node matched deep search:', trimmed);
        setSearchResults([]);
        setCurrentResultIndex(-1);
        prevSearchStateRef.current = { query: trimmed, type: 'deep' };
        return;
      }

      setSearchResults(results);
      prevSearchStateRef.current = { query: trimmed, type: 'deep' };
      setCurrentResultIndex(0);
      navigateToResult(results[0], true);
    })();
  }, [data, lang, t, navigateToResult]);

  const prevSearchStateRef = useRef<{ query: string; type: 'simple' | 'deep' | null }>({ query: '', type: null });

  useEffect(() => {
    if (!data) return;

    // If a deep search is active, do not run the simple-search flow
    if (activeSearchType === 'deep') {
      // if user cleared the input while in deep mode, clear results and reset type
      if (!searchQuery) {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        prevSearchStateRef.current = { query: '', type: null };
        setActiveSearchType(null);
      }
      return;
    }

    if (!searchQuery) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevSearchStateRef.current = { query: '', type: null };
      return;
    }

    const results = findAllPathsByQuery(data, searchQuery, t, 'simple');
    if (results.length === 0) {
      console.warn('No node matched search:', searchQuery);
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevSearchStateRef.current = { query: searchQuery, type: 'simple' };
      return;
    }

    setSearchResults(results);

    const isNewQuery = prevSearchStateRef.current.query !== searchQuery || prevSearchStateRef.current.type !== activeSearchType;
    prevSearchStateRef.current = { query: searchQuery, type: 'simple' };

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
  }, [searchQuery, lang, data, t, navigateToResult, activeSearchType]);

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
    return <div style={centeredFullscreenStyle}>{t('loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (error) {
    return <div style={{ ...centeredFullscreenStyle, color: 'red' }}>{t('error', { defaultValue: 'Error:' })} {error.message}</div>;
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
    viewMode,
    setViewMode,
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
    goForward,
    searchQuery,
    activeSearchType
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
