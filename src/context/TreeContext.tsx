import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { TreeNode, ViewMode, NodeShape, Orientation, LabelPosition, DagData, CrossEdge, TaxonomyDescription, TagStates } from '../types';
import { findNodePathIds } from '../utils/treeUtils';
import { useTaxonomyData } from '../hooks/useTaxonomyData';
import { useI18n } from '../i18n';
import { buildSpanningTree, getAllDagNodeIds, hasMultipleParents, getParents, getAllTags, findAllDagAncestors, filterDagByTags } from '../utils/dagUtils';
import { useUrlSync } from '../hooks/useUrlSync';
import { useSearchEngine } from '../hooks/useSearchEngine';
import { safeLocalStorageGet, safeLocalStorageSet, STORAGE_KEYS } from '../utils/storage';
import usePersistedState from '../hooks/usePersistedState';

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
  nodeSize: number;
  setNodeSize: (n: number) => void;
  hSpacing: number;
  setHSpacing: (n: number) => void;
  vSpacing: number;
  setVSpacing: (n: number) => void;
  nodeShape: NodeShape;
  setNodeShape: (s: NodeShape) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  labelPosition: LabelPosition;
  setLabelPosition: (lp: LabelPosition) => void;
  toggleNode: (id: string) => void;
  setExpandedToPath: (pathIds: string[]) => void;
  collapseAll: () => void;
  expandAll: () => void;
  handleSearch: (query: string, mode?: 'simple' | 'deep') => void;
  goToNextResult: () => void;
  goToPrevResult: () => void;
  setActiveId: (id: string) => void;
  clearForceCenter: () => void;
  requestForceCenter: () => void;
  resetViewTrigger: number;
  resetView: () => void;

  activeTaxonomyId: string;
  setActiveTaxonomyId: (id: string) => void;
  availableTaxonomies: TaxonomyDescription[];

  searchQuery: string;
  activeSearchType: 'simple' | 'deep' | null;

  tagStates: TagStates;
  setTagStates: (states: TagStates) => void;
  availableTags: string[];
  totalNodeCount: number;
  filteredNodeCount: number;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

const centeredFullscreenStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif'
};

export function TreeProvider({ children }: { children: ReactNode }) {
  const [availableTaxonomies, setAvailableTaxonomies] = useState<TaxonomyDescription[]>([]);
  const [activeTaxonomyId, setActiveTaxonomyId] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/taxonomies.json', { signal: controller.signal })
      .then(res => res.json())
      .then((data: TaxonomyDescription[]) => {
        setAvailableTaxonomies(data);
        if (data.length > 0 && !activeTaxonomyId) {
          const p = new URLSearchParams(window.location.search);
          const urlTaxo = p.get('taxonomy');
          const savedTaxo = urlTaxo || safeLocalStorageGet(STORAGE_KEYS.activeTaxonomyId);
          
          if (savedTaxo && data.find(t => t.id === savedTaxo)) {
            setActiveTaxonomyId(savedTaxo);
          } else {
            setActiveTaxonomyId(data[0].id);
          }
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Failed to load taxonomies registry:', err);
      });
    return () => controller.abort();
  }, []);

  const { data: rawDagData, loading, error } = useTaxonomyData(activeTaxonomyId);
  const { t, lang } = useI18n();

  const [tagStates, setTagStatesState] = usePersistedState<TagStates>(
    STORAGE_KEYS.tagStates,
    {},
    (v) => JSON.stringify(v),
    (s) => {
      try {
        return JSON.parse(s) as TagStates;
      } catch {
        return {};
      }
    }
  );

  // clear tags when taxonomy changes
  useEffect(() => {
    setTagStatesState({});
  }, [activeTaxonomyId]);

  const availableTags = useMemo(() => {
    if (!rawDagData) return [];
    const tags = getAllTags(rawDagData);
    return ['__untagged__', ...tags];
  }, [rawDagData]);

  const dagData = useMemo(() => {
    if (!rawDagData) return null;
    const hasActiveTags = Object.values(tagStates).some(state => state !== 'neutral');
    if (!hasActiveTags) return rawDagData;
    return filterDagByTags(rawDagData, tagStates);
  }, [rawDagData, tagStates]);

  const { tree: data, crossEdges } = useMemo(() => {
    if (!dagData) return { tree: null as unknown as TreeNode, crossEdges: [] as CrossEdge[] };
    return buildSpanningTree(dagData);
  }, [dagData]);

  const [viewMode, setViewModeState] = usePersistedState<ViewMode>(
    STORAGE_KEYS.viewMode,
    'tree',
    (v) => v,
    (s) => {
      if (s === 'compact') {
        safeLocalStorageSet(STORAGE_KEYS.viewMode, 'tree');
        safeLocalStorageSet(STORAGE_KEYS.nodeShape, 'rect');
        return 'tree';
      }
      if (s === 'organic') {
        safeLocalStorageSet(STORAGE_KEYS.viewMode, 'tree');
        return 'tree';
      }
      return s as ViewMode;
    }
  );

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const [nodeSize, setNodeSizeState] = usePersistedState<number>(
    STORAGE_KEYS.nodeSize,
    26,
    (v) => String(v),
    (s) => Number(s)
  );
  const setNodeSize = useCallback((n: number) => { setNodeSizeState(n); }, []);

  const [hSpacing, setHSpacingState] = usePersistedState<number>(
    STORAGE_KEYS.hSpacing,
    220,
    (v) => String(v),
    (s) => Number(s)
  );
  const setHSpacing = useCallback((n: number) => { setHSpacingState(n); }, []);

  const [vSpacing, setVSpacingState] = usePersistedState<number>(
    STORAGE_KEYS.vSpacing,
    80,
    (v) => String(v),
    (s) => Number(s)
  );
  const setVSpacing = useCallback((n: number) => { setVSpacingState(n); }, []);

  const [nodeShape, setNodeShapeState] = usePersistedState<NodeShape>(
    STORAGE_KEYS.nodeShape,
    'circle',
    (v) => v,
    (s) => (s as NodeShape) || 'circle'
  );
  const setNodeShape = useCallback((s: NodeShape) => { setNodeShapeState(s); }, []);

  const [orientation, setOrientationState] = usePersistedState<Orientation>(
    STORAGE_KEYS.orientation,
    'horizontal',
    (v) => v,
    (s) => (s as Orientation) || 'horizontal'
  );
  const setOrientation = useCallback((o: Orientation) => { setOrientationState(o); }, []);

  const [labelPosition, setLabelPositionState] = usePersistedState<LabelPosition>(
    STORAGE_KEYS.labelPosition,
    'smart',
    (v) => v,
    (s) => {
      if (s === 'auto') {
        safeLocalStorageSet(STORAGE_KEYS.labelPosition, 'smart');
        return 'smart';
      }
      return (s as LabelPosition) || 'smart';
    }
  );
  const setLabelPosition = useCallback((lp: LabelPosition) => { setLabelPositionState(lp); }, []);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string>('');
  const [forceCenterOnActive, setForceCenterOnActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  const resetView = useCallback(() => {
    setResetViewTrigger(prev => prev + 1);
  }, []);

  const setTagStates = useCallback((states: TagStates) => {
    setTagStatesState(states);
    safeLocalStorageSet(STORAGE_KEYS.tagStates, JSON.stringify(states));
    resetView();
  }, [resetView]);

  const navigateToResult = useCallback((nodeId: string, forceCenter: boolean = true) => {
    if (!data) return;
    const path = dagData ? findAllDagAncestors(dagData, nodeId) : findNodePathIds(data, nodeId);
    if (path) {
      setExpanded(new Set(path));
      setActiveId(nodeId);
      if (forceCenter) setForceCenterOnActive(true);
    }
  }, [data]);

  // Hook 1: URL synchronization
  useUrlSync(activeId, activeTaxonomyId, data, setExpanded, setActiveId, navigateToResult);

  // Hook 2: Search engine
  const {
    searchQuery,
    searchResults,
    currentResultIndex,
    activeSearchType,
    handleSearch,
    goToNextResult,
    goToPrevResult,
  } = useSearchEngine(dagData, data, lang, t, navigateToResult);

  const isFullyExpanded = useMemo(() => {
    if (!dagData) return false;
    const allIds = getAllDagNodeIds(dagData);
    return allIds.every((id) => expanded.has(id));
  }, [dagData, expanded]);

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (dagData) {
          const path = findAllDagAncestors(dagData, id);
          if (path) {
            path.forEach(pid => next.add(pid));
          }
        }
      }
      return next;
    });
  }, [dagData]);

  const setExpandedToPath = useCallback((pathIds: string[]) => {
    setExpanded(new Set(pathIds));
    setActiveId(pathIds[pathIds.length - 1]);
  }, []);

  const collapseAll = useCallback(() => {
    if (!data) return;
    let pathSet: Set<string>;
    if (dagData && activeId && hasMultipleParents(dagData, activeId)) {
      pathSet = new Set<string>();
      const parents = getParents(dagData, activeId);
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
  }, [data, activeId, expanded, resetView, dagData]);

  const expandAll = useCallback(() => {
    if (!dagData) return;
    setExpanded(new Set(getAllDagNodeIds(dagData)));
    resetView();
  }, [dagData, resetView]);

  const clearForceCenter = useCallback(() => {
    setForceCenterOnActive(false);
  }, []);

  const requestForceCenter = useCallback(() => {
    setForceCenterOnActive(true);
  }, []);

  const totalNodeCount = rawDagData ? Object.keys(rawDagData.nodes).length : 0;
  const filteredNodeCount = dagData ? Object.keys(dagData.nodes).length : 0;

  // value must be memoized before any early return to keep hook count stable
  const value = useMemo(() => ({
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
    nodeSize,
    setNodeSize,
    hSpacing,
    setHSpacing,
    vSpacing,
    setVSpacing,
    nodeShape,
    setNodeShape,
    orientation,
    setOrientation,
    labelPosition,
    setLabelPosition,
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
    searchQuery,
    activeSearchType,
    activeTaxonomyId,
    setActiveTaxonomyId,
    availableTaxonomies,
    tagStates,
    setTagStates,
    availableTags,
    totalNodeCount,
    filteredNodeCount,
  }), [
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
    nodeSize,
    setNodeSize,
    hSpacing,
    setHSpacing,
    vSpacing,
    setVSpacing,
    nodeShape,
    setNodeShape,
    orientation,
    setOrientation,
    labelPosition,
    setLabelPosition,
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
    searchQuery,
    activeSearchType,
    activeTaxonomyId,
    setActiveTaxonomyId,
    availableTaxonomies,
    tagStates,
    setTagStates,
    availableTags,
    totalNodeCount,
    filteredNodeCount,
  ]);

  if (loading && !dagData) {
    return <div style={centeredFullscreenStyle}>{t('loading', { defaultValue: 'Loading...' })}</div>;
  }

  if (error) {
    return <div style={{ ...centeredFullscreenStyle, color: 'red' }}>{t('error', { defaultValue: 'Error:' })} {error.message}</div>;
  }

  if (!data) return null;

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

export function useTree() {
  const context = useContext(TreeContext);
  if (context === undefined) {
    throw new Error('useTree must be used within a TreeProvider');
  }
  return context;
}