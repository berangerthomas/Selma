import { useState, useCallback, useRef, useEffect, useDeferredValue } from 'react';
import type { TreeNode, DagData } from '../types';
import { findMatchingIds } from '../utils/dagUtils';
import { useDeepSearch } from './useDeepSearch';
import { clearMarkdownCache } from '../utils/fetchMarkdown';
import { type TranslateFn } from '../utils/searchRegex';

export function useSearchEngine(
  dagData: DagData | null,
  data: TreeNode | null,
  lang: string,
  t: TranslateFn,
  navigateToResult: (nodeId: string, forceCenter?: boolean) => void
) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeSearchType, setActiveSearchType] = useState<'simple' | 'deep' | null>(null);
  const prevSearchStateRef = useRef<{ query: string; type: 'simple' | 'deep' | null }>({ query: '', type: null });
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);

  const { performDeepSearch } = useDeepSearch(data, lang, t);

  // Clear search cache when dagData changes (taxonomy switch)
  useEffect(() => {
    clearMarkdownCache();
  }, [dagData]);

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

    // deep search: mark active type then perform runtime fetches via useDeepSearch hook
    setActiveSearchType('deep');
    setSearchQuery(trimmed);
    performDeepSearch(trimmed).then((results: string[]) => {
      if (results.length === 0) {
        if (import.meta.env.DEV) {
          console.debug('No node matched deep search:', trimmed);
        }
        setSearchResults([]);
        setCurrentResultIndex(-1);
        prevSearchStateRef.current = { query: trimmed, type: 'deep' };
        return;
      }

      setSearchResults(results);
      prevSearchStateRef.current = { query: trimmed, type: 'deep' };
      setCurrentResultIndex(0);
      navigateToResult(results[0], true);
    });
  }, [data, performDeepSearch, navigateToResult]);

  // Effect: run simple search when deferred query changes
  useEffect(() => {
    if (!dagData) return;

    if (activeSearchType === 'deep') {
      if (!deferredSearchQuery) {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        prevSearchStateRef.current = { query: '', type: null };
        setActiveSearchType(null);
      }
      return;
    }

    if (!deferredSearchQuery) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevSearchStateRef.current = { query: '', type: null };
      return;
    }

    const results = findMatchingIds(dagData, deferredSearchQuery, t);
    if (results.length === 0) {
      if (import.meta.env.DEV) {
        console.debug('No node matched search:', deferredSearchQuery);
      }
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevSearchStateRef.current = { query: deferredSearchQuery, type: 'simple' };
      return;
    }

    const isNewQuery = prevSearchStateRef.current.query !== deferredSearchQuery || prevSearchStateRef.current.type !== activeSearchType;
    prevSearchStateRef.current = { query: deferredSearchQuery, type: 'simple' };

    setSearchResults(prevResults => {
      setCurrentResultIndex(prevIdx => {
        if (!isNewQuery && prevIdx >= 0 && prevResults[prevIdx]) {
          const activeItem = prevResults[prevIdx];
          const newIndex = results.indexOf(activeItem);
          if (newIndex >= 0) {
            return newIndex;
          }
        }
        if (!isNewQuery) return -1;
        
        // Schedule side-effect outside the render phase
        queueMicrotask(() => {
          navigateToResult(results[0], true);
        });
        return 0;
      });
      return results;
    });

  }, [deferredSearchQuery, lang, dagData, t, navigateToResult, activeSearchType]);

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

  return {
    searchQuery,
    searchResults,
    currentResultIndex,
    activeSearchType,
    handleSearch,
    goToNextResult,
    goToPrevResult,
  };
}