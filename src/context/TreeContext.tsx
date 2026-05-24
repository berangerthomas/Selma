import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { TreeNode, ViewMode, NodeShape, Orientation, DagData, CrossEdge, TaxonomyDescription, TagMatchMode } from '../types';
import { findNodePathIds } from '../utils/treeUtils';
import { useTaxonomyData } from '../hooks/useTaxonomyData';
import { useI18n } from '../i18n';
import { buildSpanningTree, getAllDagNodeIds, hasMultipleParents, getParents, getAllTags, filterDagByTags } from '../utils/dagUtils';
import { useUrlSync } from '../hooks/useUrlSync';
import { useSearchEngine } from '../hooks/useSearchEngine';
import { safeLocalStorageGet, safeLocalStorageSet, STORAGE_KEYS } from '../utils/storage';

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

  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  tagMatchMode: TagMatchMode;
  setTagMatchMode: (mode: TagMatchMode) => void;
  availableTags: string[];
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

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    try {
      const saved = safeLocalStorageGet(STORAGE_KEYS.selectedTags);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tagMatchMode, setTagMatchModeState] = useState<TagMatchMode>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.tagMatchMode);
    return saved === 'all' ? 'all' : 'any';
  });

  // clear selected tags when taxonomy changes
  useEffect(() => {
    setSelectedTags([]);
    safeLocalStorageSet(STORAGE_KEYS.selectedTags, JSON.stringify([]));
  }, [activeTaxonomyId]);

  const availableTags = useMemo(() => {
    if (!rawDagData) return [];
    return getAllTags(rawDagData);
  }, [rawDagData]);

  const dagData = useMemo(() => {
    if (!rawDagData) return null;
    if (selectedTags.length === 0) return rawDagData;
    return filterDagByTags(rawDagData, selectedTags, tagMatchMode);
  }, [rawDagData, selectedTags, tagMatchMode]);

  const { tree: data, crossEdges } = useMemo(() => {
    if (!dagData) return { tree: null as unknown as TreeNode, crossEdges: [] as CrossEdge[] };
    return buildSpanningTree(dagData);
  }, [dagData]);

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    let saved = safeLocalStorageGet(STORAGE_KEYS.viewMode);
    if (saved === 'compact') {
      safeLocalStorageSet(STORAGE_KEYS.viewMode, 'tree');
      safeLocalStorageSet(STORAGE_KEYS.nodeShape, 'rect');
      saved = 'tree';
    }
    if (saved === 'organic') {
      safeLocalStorageSet(STORAGE_KEYS.viewMode, 'tree');
      saved = 'tree';
    }
    return (saved as ViewMode) || 'tree';
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    safeLocalStorageSet(STORAGE_KEYS.viewMode, mode);
  }, []);

  const [nodeSize, setNodeSizeState] = useState<number>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.nodeSize);
    return saved ? Number(saved) : 26;
  });
  const setNodeSize = useCallback((n: number) => { setNodeSizeState(n); safeLocalStorageSet(STORAGE_KEYS.nodeSize, String(n)); }, []);

  const [hSpacing, setHSpacingState] = useState<number>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.hSpacing);
    return saved ? Number(saved) : 220;
  });
  const setHSpacing = useCallback((n: number) => { setHSpacingState(n); safeLocalStorageSet(STORAGE_KEYS.hSpacing, String(n)); }, []);

  const [vSpacing, setVSpacingState] = useState<number>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.vSpacing);
    return saved ? Number(saved) : 80;
  });
  const setVSpacing = useCallback((n: number) => { setVSpacingState(n); safeLocalStorageSet(STORAGE_KEYS.vSpacing, String(n)); }, []);

  const [nodeShape, setNodeShapeState] = useState<NodeShape>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.nodeShape);
    return (saved as NodeShape) || 'circle';
  });
  const setNodeShape = useCallback((s: NodeShape) => { setNodeShapeState(s); safeLocalStorageSet(STORAGE_KEYS.nodeShape, s); }, []);

  const [orientation, setOrientationState] = useState<Orientation>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.orientation);
    return (saved as Orientation) || 'horizontal';
  });
  const setOrientation = useCallback((o: Orientation) => { setOrientationState(o); safeLocalStorageSet(STORAGE_KEYS.orientation, o); }, []);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string>('');
  const [forceCenterOnActive, setForceCenterOnActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  const resetView = useCallback(() => {
    setResetViewTrigger(prev => prev + 1);
  }, []);

  const updateSelectedTags = useCallback((tags: string[]) => {
    setSelectedTags(tags);
    safeLocalStorageSet(STORAGE_KEYS.selectedTags, JSON.stringify(tags));
    resetView();
  }, [resetView]);

  const updateTagMatchMode = useCallback((mode: TagMatchMode) => {
    setTagMatchModeState(mode);
    safeLocalStorageSet(STORAGE_KEYS.tagMatchMode, mode);
    resetView();
  }, [resetView]);

  const navigateToResult = useCallback((nodeId: string, forceCenter: boolean = true) => {
    if (!data) return;
    const path = findNodePathIds(data, nodeId);
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
    selectedTags,
    setSelectedTags: updateSelectedTags,
    tagMatchMode,
    setTagMatchMode: updateTagMatchMode,
    availableTags,
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
    selectedTags,
    updateSelectedTags,
    tagMatchMode,
    updateTagMatchMode,
    availableTags,
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