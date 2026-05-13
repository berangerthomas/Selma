import { useState, useCallback, useRef, useEffect } from 'react';
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
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeSearchType, setActiveSearchType] = useState<'simple' | 'deep' | null>(null);
  const prevSearchStateRef = useRef<{ query: string; type: 'simple' | 'deep' | null }>({ query: '', type: null });
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);

  const currentResultIndexRef = useRef(currentResultIndex);
  const searchResultsRef = useRef(searchResults);

  useEffect(() => { currentResultIndexRef.current = currentResultIndex; }, [currentResultIndex]);
  useEffect(() => { searchResultsRef.current = searchResults; }, [searchResults]);

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
        console.debug('No node matched deep search:', trimmed);
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

  // Effect: run simple search when query changes
  useEffect(() => {
    if (!dagData) return;

    if (activeSearchType === 'deep') {
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

    const results = findMatchingIds(dagData, searchQuery, t);
    if (results.length === 0) {
      console.debug('No node matched search:', searchQuery);
      setSearchResults([]);
      setCurrentResultIndex(-1);
      prevSearchStateRef.current = { query: searchQuery, type: 'simple' };
      return;
    }

    setSearchResults(results);

    const isNewQuery = prevSearchStateRef.current.query !== searchQuery || prevSearchStateRef.current.type !== activeSearchType;
    prevSearchStateRef.current = { query: searchQuery, type: 'simple' };

    const curIdx = currentResultIndexRef.current;
    const curResults = searchResultsRef.current;
    if (!isNewQuery && curIdx >= 0 && curResults[curIdx]) {
      const activeItem = curResults[curIdx];
      const newIndex = results.indexOf(activeItem);
      if (newIndex >= 0) {
        setCurrentResultIndex(newIndex);
        return;
      }
    }

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