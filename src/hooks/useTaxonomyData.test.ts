import { describe, it, expect } from 'vitest';
import { buildDagDataFromFiles } from './useTaxonomyData';

describe('buildDagDataFromFiles', () => {
  it('builds a dag from taxonomy and nodes registry', () => {
    const taxoFile = { root: 'a', nodes: { a: { children: ['b'] }, b: { children: [] } } };
    const nodesDict = { a: { name: 'Node A' }, b: { name: 'Node B' } };

    const dag = buildDagDataFromFiles(taxoFile as any, nodesDict as any);
    expect(dag.root).toBe('a');
    expect(Object.keys(dag.nodes).sort()).toEqual(['a', 'b']);
    expect(dag.nodes.a.name).toBe('Node A');
    expect(dag.nodes.b.name).toBe('Node B');
  });

  it('enriches unreferenced nodes from nodes.json', () => {
    const taxoFile = { root: 'a', nodes: { a: { children: ['b'] } } };
    const nodesDict = { b: { name: 'Leaf B' } };

    const dag = buildDagDataFromFiles(taxoFile as any, nodesDict as any);
    expect(dag.nodes.b.name).toBe('Leaf B');
    expect(dag.nodes.b.children).toEqual([]);
  });

  it('throws on missing root or invalid format', () => {
    const taxoFile = { nodes: { a: { children: [] } } } as any;
    const nodesDict = {} as any;
    expect(() => buildDagDataFromFiles(taxoFile, nodesDict)).toThrow();
  });

  it('throws when the resulting DAG contains a cycle', () => {
    const taxoFile = { root: 'a', nodes: { a: { children: ['b'] }, b: { children: ['a'] } } };
    const nodesDict = {} as any;
    expect(() => buildDagDataFromFiles(taxoFile as any, nodesDict)).toThrow(/cycle/);
  });
});
