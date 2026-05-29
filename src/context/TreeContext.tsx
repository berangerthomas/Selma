import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { TreeNode, ViewMode, DagData, CrossEdge, TaxonomyDescription, TagStates, NodeShape, Orientation, LabelPosition } from '../types';
import { findNodePathIds } from '../utils/treeUtils';
import { useTaxonomyData } from '../hooks/useTaxonomyData';
import { useI18n } from '../i18n';
import { buildSpanningTree, getAllDagNodeIds, getAllTags, findAllDagAncestors, filterDagByTags } from '../utils/dagUtils';
import { useUrlSync } from '../hooks/useUrlSync';
import { useSearchEngine } from '../hooks/useSearchEngine';
import { useVisualizationSettings } from '../hooks/useVisualizationSettings';
import { safeLocalStorageSet, STORAGE_KEYS } from '../utils/storage';
import usePersistedState from '../hooks/usePersistedState';
import { useTaxonomyLoader } from '../hooks/useTaxonomyLoader';
import { useExpansionState } from '../hooks/useExpansionState';

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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  fontFamily: 'sans-serif',
};

export function TreeProvider({ children }: { children: ReactNode }) {
  const { availableTaxonomies, activeTaxonomyId, setActiveTaxonomyId } = useTaxonomyLoader();

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

  const [viewMode, setViewMode] = usePersistedState<ViewMode>(
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

  const {
    nodeSize, setNodeSize,
    hSpacing, setHSpacing,
    vSpacing, setVSpacing,
    nodeShape, setNodeShape,
    orientation, setOrientation,
    labelPosition, setLabelPosition,
  } = useVisualizationSettings();
  const [activeId, setActiveId] = useState<string>('');
  const [forceCenterOnActive, setForceCenterOnActive] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  const resetView = useCallback(() => {
    setResetViewTrigger(prev => prev + 1);
  }, []);

  const {
    expanded,
    setExpanded,
    toggleNode,
    setExpandedToPath,
    collapseAll,
    expandAll,
  } = useExpansionState(dagData, data, activeId, setActiveId, resetView);

  const setTagStates = useCallback((states: TagStates) => {
    setTagStatesState(states);
    safeLocalStorageSet(STORAGE_KEYS.tagStates, JSON.stringify(states));
    resetView();
  }, [resetView, setTagStatesState]);

  const navigateToResult = useCallback((nodeId: string, forceCenter: boolean = true) => {
    if (!data) return;
    const path = dagData ? findAllDagAncestors(dagData, nodeId) : findNodePathIds(data, nodeId);
    if (path) {
      setExpanded(new Set(path));
      setActiveId(nodeId);
      if (forceCenter) setForceCenterOnActive(true);
    }
  }, [data, dagData, setExpanded]);

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