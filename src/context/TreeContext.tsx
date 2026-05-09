import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TreeNode, ViewMode, DagData, CrossEdge, TaxonomyDescription } from '../types';
import { findAllPathsByQuery, findNodePath, getAllNodeIds } from '../utils/treeUtils';
import { useTaxonomyData } from '../hooks/useTaxonomyData';
import { useI18n } from '../i18n';
import { buildSpanningTree, getAllDagNodeIds, findMatchingIds, hasMultipleParents, getParents } from '../utils/dagUtils';

interface TreeContextType {
  data: TreeNode;
  dagData: DagData | null;
  crossEdges: CrossEdge[];
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

  activeTaxonomyId: string;
  setActiveTaxonomyId: (id: string) => void;
  availableTaxonomies: TaxonomyDescription[];

    searchQuery: string;
    activeSearchType: 'simple' | 'deep' | null;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

const centeredFullscreenStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif'
};

type HistoryState = { stack: string[]; index: number };
type HistoryAction = 
  | { type: 'PUSH'; id: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' };

export function TreeProvider({ children }: { children: ReactNode }) {
  const [availableTaxonomies, setAvailableTaxonomies] = useState<TaxonomyDescription[]>([]);
  const [activeTaxonomyId, setActiveTaxonomyId] = useState<string>('');

  useEffect(() => {
    fetch('/data/taxonomies.json')
      .then(res => res.json())
      .then((data: TaxonomyDescription[]) => {
        setAvailableTaxonomies(data);
        if (data.length > 0 && !activeTaxonomyId) {
          // Check if we have a saved taxonomy in URL or localStorage
          const p = new URLSearchParams(window.location.search);
          const urlTaxo = p.get('taxonomy');
          const savedTaxo = urlTaxo || localStorage.getItem('selma_activeTaxonomyId');
          
          if (savedTaxo && data.find(t => t.id === savedTaxo)) {
            setActiveTaxonomyId(savedTaxo);
          } else {
            setActiveTaxonomyId(data[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to load taxonomies registry:', err));
  }, []);

  const { data: dagData, loading, error } = useTaxonomyData(activeTaxonomyId);
  const { t, lang } = useI18n();

  useEffect(() => {
    if (activeTaxonomyId) {
      localStorage.setItem('selma_activeTaxonomyId', activeTaxonomyId);
      const url = new URL(window.location.href);
      if (url.searchParams.get('taxonomy') !== activeTaxonomyId) {
        url.searchParams.set('taxonomy', activeTaxonomyId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [activeTaxonomyId]);

  const { tree: data, crossEdges } = useMemo(() => {
    if (!dagData) return { tree: null as unknown as TreeNode, crossEdges: [] as CrossEdge[] };
    return buildSpanningTree(dagData);
  }, [dagData]);

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
  const prevSearchStateRef = useRef<{ query: string; type: 'simple' | 'deep' | null }>({ query: '', type: null });
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
  const [forceCenterOnActive, setForceCenterOnActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

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
    if (!dagData) return false;
    const allIds = getAllDagNodeIds(dagData);
    return allIds.every((id) => expanded.has(id));
  }, [dagData, expanded]);

  const isInitialMount = useRef(true);

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
  }, [data]);

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

  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const nodeId = p.get('node');
      if (nodeId && data) {
         const path = findNodePath(data, nodeId)?.map(n => n.id);
         if (path) {
           setExpanded(new Set(path));
           setActiveId(nodeId);
           setForceCenterOnActive(true);
         }
      } else if (data) {
        setExpanded(new Set([data.id]));
        setActiveId('');
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
    // If the active node has multiple DAG parents, keep all origin branches (paths to each parent)
    let pathSet: Set<string>;
    if (dagData && activeId && hasMultipleParents(dagData, activeId)) {
      pathSet = new Set<string>();
      const parents = getParents(dagData, activeId);
      for (const p of parents) {
        const ppath = findNodePath(data, p)?.map(n => n.id) ?? [];
        ppath.forEach(id => pathSet.add(id));
      }
      // also ensure the active node itself is present (it may be off the primary branch)
      pathSet.add(activeId);
    } else {
      // default behaviour: path from root to active node in the spanning tree
      const path = findNodePath(data, activeId || data.id)?.map(n => n.id) ?? [data.id];
      pathSet = new Set(path);
    }

    // Current status: are there expanded nodes that are NOT on the preserved path(s)?
    const hasNodesOutsidePath = Array.from(expanded).some(id => !pathSet.has(id));

    if (hasNodesOutsidePath) {
      // Step 1: collapse everything else to isolate only the selected node's branch(es)
      setExpanded(pathSet);
    } else {
      // Step 2 (or if the branch was already the only one open): collapse everything back to the root
      setExpanded(new Set([data.id]));
      setActiveId(data.id);
    }

    resetView();
  }, [data, activeId, expanded, resetView]);

  const expandAll = useCallback(() => {
    if (!dagData) return;
    setExpanded(new Set(getAllDagNodeIds(dagData)));
    resetView();
  }, [dagData, resetView]);

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
        const simpleMatches = findAllPathsByQuery(data, trimmed, t);
        simpleMatches.forEach((id) => resultsSet.add(id));
      } catch (e) {
        // ignore
      }

      // gather all node ids
      const allIds = getAllNodeIds(data);

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

  useEffect(() => {
    if (!dagData) return;

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

    // Use the translation function directly
    const results = findMatchingIds(dagData, searchQuery, (key, opts) => t(key, opts as any) as string);
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
  }, [searchQuery, lang, dagData, t, navigateToResult, activeSearchType]);

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

  if (loading && !dagData) {
    return <div style={centeredFullscreenStyle}>{t('loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (error) {
    return <div style={{ ...centeredFullscreenStyle, color: 'red' }}>{t('error', { defaultValue: 'Error:' })} {error.message}</div>;
  }

  if (!data) return null;

  if (!data) {
    return null;
  }

  const value = {
    data,
    dagData,
    crossEdges,
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
    activeSearchType,
    activeTaxonomyId,
    setActiveTaxonomyId,
    availableTaxonomies
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
