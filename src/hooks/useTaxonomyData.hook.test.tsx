// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { useTaxonomyData } from './useTaxonomyData';

function HookTestComponent({ taxonomyId }: { taxonomyId: string }) {
  const { data, loading, error } = useTaxonomyData(taxonomyId);
  return (
    <div>
      <div data-testid="loading">{loading ? '1' : '0'}</div>
      <div data-testid="error">{error ? error.message : ''}</div>
      <div data-testid="nodes">{data ? Object.keys(data.nodes).join(',') : ''}</div>
      <div data-testid="root">{data ? data.root : ''}</div>
    </div>
  );
}

describe('useTaxonomyData integration', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    global.fetch = realFetch;
  });

  it('loads taxonomy and nodes when both are available', async () => {
    vi.stubGlobal('fetch', vi.fn((url: any) => {
      if ((url as string).endsWith('/data/nodes.json')) {
        return Promise.resolve(new Response(JSON.stringify({ a: { name: 'A' }, b: { name: 'B' } }), { status: 200 }));
      }
      if ((url as string).includes('/data/taxonomies/test.json')) {
        return Promise.resolve(new Response(JSON.stringify({ root: 'a', nodes: { a: { children: ['b'] }, b: { children: [] } } }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    }));

    render(<HookTestComponent taxonomyId="test" />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('0'));
    expect(screen.getByTestId('root').textContent).toBe('a');
    expect(screen.getByTestId('nodes').textContent.split(',').sort()).toEqual(['a', 'b']);
  });

  it('falls back when nodes.json is missing', async () => {
    vi.stubGlobal('fetch', vi.fn((url: any) => {
      if ((url as string).endsWith('/data/nodes.json')) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      if ((url as string).includes('/data/taxonomies/test.json')) {
        return Promise.resolve(new Response(JSON.stringify({ root: 'x', nodes: { x: { children: ['y'] } } }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    }));

    render(<HookTestComponent taxonomyId="test" />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('0'));
    expect(screen.getByTestId('root').textContent).toBe('x');
    // y should exist as a node (enriched with default name)
    expect(screen.getByTestId('nodes').textContent.split(',').sort()).toEqual(['x', 'y']);
  });

  it('reports error when taxonomy file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn((url: any) => {
      if ((url as string).endsWith('/data/nodes.json')) {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      }
      if ((url as string).includes('/data/taxonomies/missing.json')) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    }));

    render(<HookTestComponent taxonomyId="missing" />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('0'));
    expect(screen.getByTestId('error').textContent.length).toBeGreaterThan(0);
  });
});
