import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
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
  toggleNode: (id: string) => void;
  setExpandedToPath: (pathIds: string[]) => void;
  collapseAll: () => void;
  handleSearch: (query: string) => void;
  goToNextResult: () => void;
  goToPrevResult: () => void;
  setActiveId: (id: string) => void;
  clearForceCenter: () => void;
  requestForceCenter: () => void;
  resetViewTrigger: number;
  resetView: () => void;
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
    if (data) {
      setExpanded(new Set([data.id]));
      setActiveId(data.id);
    }
  }, [data]);

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
    
    setCurrentResultIndex(0);
    // If it's a new query, force center. If it's just a language change, don't.
    navigateToResult(results[0], isNewQuery);
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

  const resetView = useCallback(() => {
    setResetViewTrigger(prev => prev + 1);
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>{t('loading', { defaultValue: 'Chargement...' })}</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'red', fontFamily: 'sans-serif' }}>{t('error', { defaultValue: 'Erreur:' })} {error.message}</div>;
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
    toggleNode,
    setExpandedToPath,
    collapseAll,
    handleSearch,
    goToNextResult,
    goToPrevResult,
    setActiveId,
    clearForceCenter,
    requestForceCenter,
    resetViewTrigger,
    resetView
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
