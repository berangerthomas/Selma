import { describe, it, expect } from 'vitest'
import {
  buildSpanningTree,
  findDagPath,
  findAllDagAncestors,
  hasCycle,
  hasMultipleParents,
  getParents,
  buildParentMap,
} from './dagUtils'
import type { DagData } from '../types'

// ──────────────────────────────────────────────────────────────────────
// Test fixtures: a small DAG with one obvious multi-parent node.
// Mirrors the running-example pattern used in Issue #20 ("Dolphin" under
// both "Mammalia" and "Cetacea") so the assertions match the spec.
// ──────────────────────────────────────────────────────────────────────

const sampleDag: DagData = {
  root: 'life',
  nodes: {
    life:     { id: 'life',     name: 'Life',     children: ['animalia', 'plantae'] },
    animalia: { id: 'animalia', name: 'Animalia', children: ['mammalia', 'cetacea'] },
    mammalia: { id: 'mammalia', name: 'Mammalia', children: ['dolphin', 'bat'] },
    cetacea:  { id: 'cetacea',  name: 'Cetacea',  children: ['dolphin', 'whale'] },
    dolphin:  { id: 'dolphin',  name: 'Dolphin' },
    bat:      { id: 'bat',      name: 'Bat' },
    whale:    { id: 'whale',    name: 'Whale' },
    plantae:  { id: 'plantae',  name: 'Plantae',  children: [] },
  },
}

/** Walk a spanning TreeNode to find a node by id. */
function findTreeNode(root: { id: string; children?: { id: string; children?: any[] }[] }, id: string): any {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const r = findTreeNode(c, id);
    if (r) return r;
  }
  return null;
}

describe('dagUtils — findDagPath', () => {
  it('returns a single-path DAG as the unique root→target path', () => {
    // bat has only one parent → result is unambiguous
    const path = findDagPath(sampleDag, 'life', 'bat')
    expect(path.map(n => n.id)).toEqual(['life', 'animalia', 'mammalia', 'bat'])
  })

  it('returns the first path discovered when the target has multiple parents', () => {
    // dolphin has both mammalia and cetacea as parents. Without a
    // preferred parent, the DFS finds "mammalia" first.
    const path = findDagPath(sampleDag, 'life', 'dolphin')
    expect(path.map(n => n.id)).toEqual(['life', 'animalia', 'mammalia', 'dolphin'])
  })

  it('routes the path through the preferred parent when supplied', () => {
    // Same target as above but the user navigated through Cetacea, so
    // MillerColumnsView will request a path through that parent.
    const path = findDagPath(sampleDag, 'life', 'dolphin', 'cetacea')
    expect(path.map(n => n.id)).toEqual(['life', 'animalia', 'cetacea', 'dolphin'])
  })

  it('returns an empty array when the target is unreachable', () => {
    const path = findDagPath(sampleDag, 'life', 'ghost')
    expect(path).toEqual([])
  })

  it('returns an empty array when root does not exist', () => {
    const path = findDagPath(sampleDag, 'ghost', 'dolphin')
    expect(path).toEqual([])
  })
})

describe('dagUtils — buildSpanningTree + cross-edges', () => {
  it('marks the second parent of a multi-parent node as a cross-edge', () => {
    const { tree, crossEdges } = buildSpanningTree(sampleDag)
    // "dolphin" was claimed by mammalia first → cetacea→dolphin is the cross-edge
    expect(crossEdges).toEqual([{ parentId: 'cetacea', childId: 'dolphin' }])
    // The tree must contain dolphin only once, under mammalia
    const mammalia = findTreeNode(tree, 'mammalia')!
    expect(mammalia.children.map((c: any) => c.id)).toEqual(['dolphin', 'bat'])
    const cetacea = findTreeNode(tree, 'cetacea')!
    expect(cetacea.children.map((c: any) => c.id)).toEqual(['whale']) // no dolphin here
  })
})

describe('dagUtils — multi-parent helpers', () => {
  it('identifies multi-parent nodes', () => {
    expect(hasMultipleParents(sampleDag, 'dolphin')).toBe(true)
    expect(hasMultipleParents(sampleDag, 'bat')).toBe(false)
  })

  it('returns all direct parents of a node', () => {
    const parents = getParents(sampleDag, 'dolphin')
    expect(new Set(parents)).toEqual(new Set(['mammalia', 'cetacea']))
  })

  it('buildParentMap enables O(1) parent lookups', () => {
    const map = buildParentMap(sampleDag)
    expect(new Set(map.get('dolphin')!)).toEqual(new Set(['mammalia', 'cetacea']))
    expect(map.get('bat')).toEqual(['mammalia'])
  })

  it('findAllDagAncestors returns all ancestors including the target', () => {
    const ancestors = findAllDagAncestors(sampleDag, 'dolphin')
    // dolphin → {mammalia, cetacea} → animalia → life
    expect(new Set(ancestors)).toEqual(new Set(['dolphin', 'mammalia', 'cetacea', 'animalia', 'life']))
  })
})

describe('dagUtils — cycle detection', () => {
  it('returns false for an acyclic DAG', () => {
    expect(hasCycle(sampleDag)).toBe(false)
  })

  it('returns true when a cycle is present', () => {
    const cyclic: DagData = {
      root: 'a',
      nodes: {
        a: { id: 'a', name: 'A', children: ['b'] },
        b: { id: 'b', name: 'B', children: ['c'] },
        c: { id: 'c', name: 'C', children: ['a'] }, // closes the cycle
      },
    }
    expect(hasCycle(cyclic)).toBe(true)
  })
})
