// @vitest-environment jsdom
import { useEffect } from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../utils/dagUtils', () => ({
  findMatchingIds: vi.fn(),
}));

vi.mock('./useDeepSearch', () => ({
  useDeepSearch: vi.fn(() => ({ performDeepSearch: vi.fn() })),
}));

import { useSearchEngine } from './useSearchEngine';
import { findMatchingIds } from '../utils/dagUtils';
import { useDeepSearch } from './useDeepSearch';

function HookHolder({ dagData, data, navigateToResult }: any) {
  const hook = useSearchEngine(dagData, data, 'en', (k: string) => k, navigateToResult);
  useEffect(() => {
    (globalThis as any).__searchHook = hook;
    return () => { delete (globalThis as any).__searchHook; };
  }, [hook]);
  return null;
}

describe('useSearchEngine', () => {
  beforeEach(() => {
    (findMatchingIds as any).mockReset();
    (useDeepSearch as any).mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('performs simple search and navigates to first result', async () => {
    (findMatchingIds as any).mockReturnValue(['n1', 'n2']);
    const nav = vi.fn();
    render(<HookHolder dagData={{} as any} data={{} as any} navigateToResult={nav} />);

    const hook = (globalThis as any).__searchHook;
    await waitFor(() => hook.handleSearch('term', 'simple'));

    await waitFor(() => expect(hook.searchResults).toEqual(['n1', 'n2']));
    expect(nav).toHaveBeenCalledWith('n1', true);
  });

  it('performs deep search and navigates to first deep result', async () => {
    const performDeep = vi.fn(() => Promise.resolve(['d1']));
    (useDeepSearch as any).mockReturnValue({ performDeepSearch: performDeep });
    const nav = vi.fn();
    render(<HookHolder dagData={{} as any} data={{} as any} navigateToResult={nav} />);

    const hook = (globalThis as any).__searchHook;
    await hook.handleSearch('deepquery', 'deep');
    await waitFor(() => expect(performDeep).toHaveBeenCalledWith('deepquery'));
    await waitFor(() => expect(hook.searchResults).toEqual(['d1']));
    expect(nav).toHaveBeenCalledWith('d1', true);
  });

  it('cycles next/prev result indices', async () => {
    (findMatchingIds as any).mockReturnValue(['a', 'b', 'c']);
    const nav = vi.fn();
    render(<HookHolder dagData={{} as any} data={{} as any} navigateToResult={nav} />);
    const hook = (globalThis as any).__searchHook;

    await waitFor(() => hook.handleSearch('x', 'simple'));
    await waitFor(() => expect(hook.searchResults.length).toBe(3));

    hook.goToNextResult();
    expect(hook.currentResultIndex).toBe(1);
    expect(nav).toHaveBeenCalledWith('b');

    hook.goToPrevResult();
    expect(hook.currentResultIndex).toBe(0);
    expect(nav).toHaveBeenCalledWith('a');
  });

  it('resets search when query is empty', async () => {
    (findMatchingIds as any).mockReturnValue(['x']);
    const nav = vi.fn();
    render(<HookHolder dagData={{} as any} data={{} as any} navigateToResult={nav} />);
    const hook = (globalThis as any).__searchHook;

    await hook.handleSearch('x', 'simple');
    await waitFor(() => expect(hook.searchResults.length).toBeGreaterThan(0));

    await hook.handleSearch('   ', 'simple');
    await waitFor(() => expect(hook.searchResults.length).toBe(0));
    expect(hook.currentResultIndex).toBe(-1);
  });
});
