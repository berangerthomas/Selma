import { describe, expect, it } from 'vitest';
import { getNodeIdFromSearch, hasInitialNodeParam, syncNodeInUrl, syncTaxonomyInUrl } from './useUrlSync';

describe('hasInitialNodeParam', () => {
  it('preserves node-aware URLs during initial hydration', () => {
    expect(hasInitialNodeParam('?taxonomy=chronological&node=nabataean')).toBe(true);
  });

  it('returns false when node is absent', () => {
    expect(hasInitialNodeParam('?taxonomy=chronological')).toBe(false);
  });
});

describe('syncTaxonomyInUrl', () => {
  it('keeps node in place when taxonomy is synchronized', () => {
    expect(
      syncTaxonomyInUrl('http://localhost:5173/?taxonomy=chronological&node=nabataean', 'chronological')
    ).toBe('http://localhost:5173/?taxonomy=chronological&node=nabataean');
  });
});

describe('syncNodeInUrl', () => {
  it('adds node without dropping taxonomy', () => {
    expect(
      syncNodeInUrl('http://localhost:5173/?taxonomy=chronological', 'nabataean')
    ).toEqual({
      href: 'http://localhost:5173/?taxonomy=chronological&node=nabataean',
      method: 'push',
    });
  });

  it('does not create duplicate history entries when the node is unchanged', () => {
    expect(
      syncNodeInUrl('http://localhost:5173/?taxonomy=chronological&node=nabataean', 'nabataean')
    ).toEqual({
      href: 'http://localhost:5173/?taxonomy=chronological&node=nabataean',
      method: 'none',
    });
  });

  it('uses replace during history navigation and keeps taxonomy intact', () => {
    expect(
      syncNodeInUrl('http://localhost:5173/?taxonomy=chronological&node=nabataean', 'arabic', true)
    ).toEqual({
      href: 'http://localhost:5173/?taxonomy=chronological&node=arabic',
      method: 'replace',
    });
  });

  it('removes node while preserving taxonomy', () => {
    expect(
      syncNodeInUrl('http://localhost:5173/?taxonomy=chronological&node=nabataean', '')
    ).toEqual({
      href: 'http://localhost:5173/?taxonomy=chronological',
      method: 'push',
    });
  });
});

describe('getNodeIdFromSearch', () => {
  it('reads the active node back from the URL search string', () => {
    expect(getNodeIdFromSearch('?taxonomy=chronological&node=nabataean')).toBe('nabataean');
  });

  it('returns null when the node parameter is absent', () => {
    expect(getNodeIdFromSearch('?taxonomy=chronological')).toBeNull();
  });
});