import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useI18n } from '../i18n'
import { useTree } from '../context/TreeContext'
import type { TreeNode } from '../types'
import { findNodeById } from '../utils/treeUtils'
import { hasMultipleParents, getParents } from '../utils/dagUtils'
import Sidebar from './Sidebar'
import { HighlightSVGText } from '../utils/highlightSVG'
type Props = {
  forwardedSvgRef?: React.RefObject<SVGSVGElement | null>
}

// Extracted from useMemo to fix typing issues module-wide
export interface PrunedNode extends Omit<TreeNode, 'children'> {
  __cluster_for?: string
  __cluster_count?: number
  children?: PrunedNode[]
  image?: string
  iconChar?: string
  iconFont?: string
}

function computeBounds(
  ids: Iterable<string>,
  positions: Map<string, { x: number; y: number }>
): { minX: number; maxX: number; minY: number; maxY: number; count: number } | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0
  for (const id of ids) {
    const p = positions.get(id)
    if (!p) continue
    count++
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return count > 0 ? { minX, maxX, minY, maxY, count } : null
}

const COLLAPSE_DEPTH = 1
const CENTER_MARGIN = 120
// Centralized animation durations (ms)
const ANIMATION_MS = 1000 // Duration for all animations; except individual CSS transitions can use fractions of this via CSS variables
const OPACITY_MS = Math.round(ANIMATION_MS / 2)
const NODE_TRANSITION = `transform ${ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1)`

// Définissez ici le ratio de centrage horizontal pour l'écran (0 = à gauche, 0.5 = au milieu, 1 = à droite)
const NODE_CENTER_RATIO = 0.5

function computeTransform(
  nodePos: { x: number, y: number },
  subtreeExtents: { minX: number, maxX: number, minY: number, maxY: number } | null,
  svgRect: DOMRect | { width: number, height: number },
  sidebarOffset: number,
  forcedScale?: number
): d3.ZoomTransform {
  const topOcclusion = 30 // Toolbar on top
  const bottomOcclusion = 40 // Breadcrumb on bottom
  const leftOcclusion = 20
  const rightOcclusion = 20

  const effectiveWidth = Math.max(10, svgRect.width - sidebarOffset - leftOcclusion - rightOcclusion)
  const availableHeight = Math.max(10, svgRect.height - topOcclusion - bottomOcclusion)

  let targetScale = forcedScale || 1

  if (subtreeExtents && !forcedScale) {
    const visualMinY = subtreeExtents.minY - 40 // Adjusts the left margin (space before the root node).
    const visualMaxY = subtreeExtents.maxY + 350 // Adjusts the right margin (space after the deepest nodes, usually for text).
    const visualMinX = subtreeExtents.minX - 30 // Adjusts the top margin.
    const visualMaxX = subtreeExtents.maxX + 140 // Adjusts the bottom margin.

    const treeWidth = Math.max(1, visualMaxY - visualMinY)
    const treeHeight = Math.max(1, visualMaxX - visualMinX)

    const scaleX = effectiveWidth / treeWidth
    const scaleY = availableHeight / treeHeight

    const proposed = Math.min(scaleX, scaleY)
    const MIN_SCALE = 0.05
    const MAX_SCALE = 1.3
    targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, proposed))

    // Position the tree bounding box perfectly centered within the safe area
    const tx = leftOcclusion + (effectiveWidth - treeWidth * targetScale) / 2 - visualMinY * targetScale
    const ty = topOcclusion + (availableHeight - treeHeight * targetScale) / 2 - visualMinX * targetScale

    return d3.zoomIdentity.translate(tx, ty).scale(targetScale)
  }

  // Centre horizontal : utilisation de NODE_CENTER_RATIO (ex: 0.5 pour le centre)
  const tx = leftOcclusion + effectiveWidth * NODE_CENTER_RATIO - nodePos.y * targetScale
  const ty = topOcclusion + availableHeight / 2 - nodePos.x * targetScale
  
  return d3.zoomIdentity.translate(tx, ty).scale(targetScale)
}

import { useSidebar } from '../hooks/useSidebar';
import { buildPrunedHierarchy } from '../utils/dagUtils'

export default function TreeViz({ forwardedSvgRef }: Props) {
  const defaultSvgRef = useRef<SVGSVGElement | null>(null)
  const svgRef = forwardedSvgRef || defaultSvgRef
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const innerGroupRef = useRef<SVGGElement | null>(null)
  const {
    data,
    dagData,
    crossEdges,
    expanded,
    activeId,
    forceCenterOnActive,
    isFullyExpanded,
    resetViewTrigger,
    viewMode,
    setActiveId,
    clearForceCenter,
    toggleNode,
    requestForceCenter,
    searchQuery
  } = useTree()

  const onToggleNode = (id: string) => {
    const willOpen = !expanded.has(id)
    toggleNode(id);
    setActiveId(id);
    if (willOpen || isFullyExpanded) requestForceCenter();
  };

  const lastActiveRef = useRef<string | null>(null)
  const { t, lang } = useI18n()
  const lastLangRef = useRef<string>(lang)
  const [hovered, setHovered] = useState<string | null>(null)
  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId);

  const clearSelection = () => {
    setSidebarOpen(false)
    setActiveId('')
  }

  // Build pruned tree and preserve node metadata (color)
  const layoutRoot = useMemo(() => {
    // Build pruned hierarchy first
    const prunedRoot = buildPrunedHierarchy(data as TreeNode, expanded, COLLAPSE_DEPTH) as d3.HierarchyNode<PrunedNode>

    // Compute dynamic vertical spacing based on longest visible label (approximate)
    const isCompact = viewMode === 'compact'
    let verticalSpacing = isCompact ? 32 : 60
    if (!isCompact) {
      try {
        const names = prunedRoot.descendants().map(d => t(`nodes.${d.data.id}.name`, { defaultValue: d.data.name || '' }))
        const maxLen = Math.max(...names.map(n => (n || '').length), 0)
        // approximate: 8px per char, clamp between 60 and 140
        verticalSpacing = Math.max(60, Math.min(140, Math.round(maxLen * 8)))
      } catch (e) {
        verticalSpacing = 100
      }
    }

    const root = prunedRoot as d3.HierarchyPointNode<PrunedNode>
    return d3.tree<PrunedNode>()
      .nodeSize(isCompact ? [32, 176] : [verticalSpacing, 220])
      .separation((a, b) => a.parent === b.parent ? 1 : (isCompact ? 1.1 : 1.4))
    (root as any)
  }, [data, expanded, viewMode, t])

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; depth: number }>()
    layoutRoot.descendants().forEach((d) => {
      map.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0, depth: d.depth })
    })
    return map
  }, [layoutRoot])

  const visibleNodes = useMemo(() => layoutRoot.descendants(), [layoutRoot])

  const links = useMemo(() => {
    // Use D3's native links() produced from the hierarchy to avoid manual construction.
    // layoutRoot.links() returns objects with .source and .target nodes.
    return layoutRoot.links() as Array<d3.HierarchyLink<PrunedNode>>
  }, [visibleNodes])

  function findD3NodeById(id: string) {
    return layoutRoot.descendants().find((d) => d.data.id === id) as d3.HierarchyPointNode<PrunedNode> | undefined
  }

  // Find either the visible node, its cluster surrogate, or the cluster node representing it.
  function findVisibleOrClusterNode(id: string) {
    const direct = findD3NodeById(id)
    if (direct) return direct
    const cluster = findD3NodeById(`${id}__cluster`)
    if (cluster) return cluster
    // fallback: find any node whose __cluster_for equals id
    return layoutRoot.descendants().find((d) => (d.data as any).__cluster_for === id) as d3.HierarchyPointNode<PrunedNode> | undefined
  }


  function collectSubtreeIds(id: string) {
    const node = findD3NodeById(id)
    const set = new Set<string>()
    if (!node) return set
    node.descendants().forEach((d) => set.add(d.data.id))
    return set
  }

  const activeSubtree = useMemo(() => collectSubtreeIds(activeId), [activeId, layoutRoot])

  const activePathAndSubtree = useMemo(() => {
    const set = new Set<string>()
    if (!activeId) return set
    const node = findD3NodeById(activeId)
    if (!node) return set
    
    let current: d3.HierarchyPointNode<PrunedNode> | null = node
    while (current) {
      set.add(current.data.id)
      current = current.parent
    }
    
    node.descendants().forEach((d) => set.add(d.data.id))
    return set
  }, [activeId, layoutRoot])

  // All DAG ancestors (all parent chains) of the active node — used to highlight secondary paths
  const activeDagAncestors = useMemo(() => {
    const set = new Set<string>()
    if (!activeId || !dagData) return set
    const dd = dagData as any
    function dfsUp(id: string) {
      if (set.has(id)) return
      set.add(id)
      const parents = getParents(dd, id)
      for (const p of parents) dfsUp(p)
    }
    dfsUp(activeId)
    return set
  }, [activeId, dagData])

  function isInViewport(id: string, margin = CENTER_MARGIN) {
    const svgEl = svgRef.current
    if (!svgEl) return false
    const p = positions.get(id)
    if (!p) return false
    const t = d3.zoomTransform(svgEl)
    const screenX = p.y * t.k + t.x
    const screenY = p.x * t.k + t.y
    const { width, height } = svgEl.getBoundingClientRect()
    const effectiveWidth = width - (sidebarOpen ? sidebarWidth : 0)
    return screenX >= margin && screenX <= effectiveWidth - margin && screenY >= margin && screenY <= height - margin
  }

  const activeIdRef = useRef<string>(activeId)
  useLayoutEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useLayoutEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const centerIcons = () => {
      const icons = svgEl.querySelectorAll('text.icon-char, image.icon-img, svg.icon-svg, g.icon-svg') as NodeListOf<SVGElement>
      icons.forEach((el) => {
        try {
          el.removeAttribute('transform')
          const bbox = (el as unknown as SVGGraphicsElement).getBBox()
          const cx = bbox.x + bbox.width / 2
          const cy = bbox.y + bbox.height / 2
          el.setAttribute('transform', `translate(${-cx}, ${-cy})`)
        } catch (err) {
          // getBBox may throw if element not ready; ignore and rely on retries/listeners
        }
      })
    }

    // Initial attempt
    centerIcons()

    // Re-run after fonts are available (helps icon fonts)
    if ((document as any).fonts && (document as any).fonts.ready) {
      (document as any).fonts.ready.then(() => {
        centerIcons()
      }).catch(() => {})
    }

    // Re-run when SVG <image> elements load
    const imgs = svgEl.querySelectorAll('image.icon-img') as NodeListOf<SVGImageElement>
    const onImgLoad = () => centerIcons()
    imgs.forEach((img) => img.addEventListener('load', onImgLoad))

    // Also re-run on window load and provide timed retries for late-loaded resources
    window.addEventListener('load', onImgLoad)
    const timers: number[] = []
    timers.push(window.setTimeout(centerIcons, 250))
    timers.push(window.setTimeout(centerIcons, 800))
    timers.push(window.setTimeout(centerIcons, 2000))

    return () => {
      imgs.forEach((img) => img.removeEventListener('load', onImgLoad))
      window.removeEventListener('load', onImgLoad)
      timers.forEach(clearTimeout)
      // no-op for fontsListener; it's a promise that resolves once
    }
  }, [visibleNodes, lang])

  useEffect(() => {
    // Inject CSS variables so CSS transitions use the same timing as JS animations
    try {
      document.documentElement.style.setProperty('--anim-ms', `${ANIMATION_MS}ms`)
    } catch (e) {
      // ignore (server-side rendering or restricted environment)
    }

    const svgEl = svgRef.current
    if (!svgEl) return
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (event) => {
        if (innerGroupRef.current) {
          innerGroupRef.current.setAttribute('transform', event.transform.toString())
        }
      })
    zoomRef.current = zoom
    d3.select(svgEl).call(zoom)
    const handleResize = () => { 
      const currentActiveId = activeIdRef.current
      if (currentActiveId && !isInViewport(currentActiveId)) {
        const current = d3.zoomTransform(svgEl)
        centerOn(currentActiveId, current.k || 1) 
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // Single-run on mount; dynamic dependencies are accessed via hooks/refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    lastLangRef.current = lang
  }, [lang])

  useEffect(() => {
    // recompute centering only when active changes or when forced
    const svgEl = svgRef.current
    if (!svgEl) return
    
    if (!activeId) { lastActiveRef.current = activeId; return }

    const p = positions.get(activeId)
    if (!p) return

    const current = d3.zoomTransform(svgEl)
    const targetScale = Math.max(0.9, Math.min(1.6, current.k || 1))
    
    centerOn(activeId, targetScale)
    lastActiveRef.current = activeId
    if (forceCenterOnActive) { clearForceCenter(); }
    // Intentional omission of other dependencies (refs and stable functions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, positions, sidebarOpen, sidebarWidth, forceCenterOnActive])

  useEffect(() => {
    // If sidebar state changes and we have an active node, ensure it remains centered
    const svgEl = svgRef.current
    if (svgEl && activeId) {
      const current = d3.zoomTransform(svgEl)
      centerOn(activeId, current.k || 1)
    }
    // Intentional omission: re-centering only on sidebar change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, sidebarWidth])

  const fitView = (duration: number = ANIMATION_MS) => {
    const svgEl = svgRef.current
    if (!svgEl || !layoutRoot) return

    const bounds = computeBounds(
      layoutRoot.descendants().map(n => n.data.id),
      positions
    )
    if (!bounds) return
    const { minX, maxX, minY, maxY } = bounds

    const rootPos = positions.get(layoutRoot.data.id)
    if (!rootPos) return
    
    const extents = { minX, maxX, minY, maxY }
    const rect = svgEl.getBoundingClientRect()
    const transform = computeTransform(rootPos, extents, rect, sidebarOpen ? sidebarWidth : 0)

    d3.select(svgEl).transition().duration(duration).call(zoomRef.current!.transform as any, transform)
  }

  const lastResetRef = useRef<number>(0)
  const initialFitDone = useRef<boolean>(false)

  // Fit view on initial load and when viewMode changes
  useEffect(() => {
    if (!initialFitDone.current && layoutRoot && positions.size > 0 && zoomRef.current) {
      initialFitDone.current = true
      fitView(0)
    }
  }, [layoutRoot, positions])

  useEffect(() => {
    if (initialFitDone.current && layoutRoot && positions.size > 0) {
      fitView(ANIMATION_MS)
    }
  }, [viewMode])

  useEffect(() => {
    if (resetViewTrigger > lastResetRef.current && layoutRoot && layoutRoot.descendants().length > 0) {
      lastResetRef.current = resetViewTrigger
      fitView()
    }
  }, [resetViewTrigger, layoutRoot, positions, sidebarOpen, sidebarWidth])

  function centerOn(id: string, scale = 1) {
    const svgEl = svgRef.current
    if (!svgEl || !zoomRef.current) return
    const p = positions.get(id)
    if (!p) return
    const rect = svgEl.getBoundingClientRect()
    const transform = computeTransform(p, null, rect, sidebarOpen ? sidebarWidth : 0, scale)
    d3.select(svgEl).transition().duration(ANIMATION_MS).call(zoomRef.current.transform as any, transform)
  }

  function colorFor(node: d3.HierarchyPointNode<PrunedNode>) {
    const clusterFor = node.data.__cluster_for
    if (clusterFor) {
      let original = findD3NodeById(clusterFor)
      if (!original) {
        // try searching the original data source
        const src = findNodeById(data, clusterFor as string)
        if (src) original = { data: src } as any
      }
      if (original) {
        if (original.data && (original.data as any).color) return (original.data as any).color
      }
    }
    let cur: d3.HierarchyPointNode<PrunedNode> | null = node
    while (cur) {
      if (cur.data.color) return cur.data.color
      cur = (cur.parent as d3.HierarchyPointNode<PrunedNode>) || null
    }
    return '#6b7280'
  }

  // D3 link generator for organic mode (horizontal tree: x = node.x, y = node.y)
  const linkGenerator = useMemo(() => {
    return d3.linkHorizontal<any, any>().x((d: any) => d.y).y((d: any) => d.x)
  }, [])

  function linkPath(sx: number, sy: number, tx: number, ty: number) {
    // Keep compact elbow path behaviour for compact mode
    if (viewMode === 'compact') {
      const midx = sx + (tx - sx) / 2
      return `M${sx},${sy} L${midx},${sy} L${midx},${ty} L${tx},${ty}`
    }
    // Fallback cubic for non-compact (should be covered by linkGenerator when using nodes)
    const dx = (tx - sx) / 2
    return `M${sx},${sy}C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`
  }

  const activeNode = findD3NodeById(activeId)

  function getDisplayY(node: d3.HierarchyPointNode<PrunedNode>): number {
    const p = positions.get(node.data.id)!
    if (viewMode !== 'compact' || !node.parent) return p.y
    const parentPos = positions.get(node.parent.data.id)
    if (!parentPos) return p.y
    return p.y - (p.y - parentPos.y) / 3
  }

  return (
    <div
      className="viz-container"
      onClick={clearSelection}
    >
      <svg ref={svgRef as React.LegacyRef<SVGSVGElement>} className="viz-svg">
        <g ref={innerGroupRef as React.LegacyRef<SVGGElement>}>
          {/* Cross-edges group - rendered first so primary edges are drawn on top */}
          {dagData && crossEdges && (
            <g className="cross-edges">
              {crossEdges.map((edge) => {
                const src = positions.get(edge.parentId);
                const tgt = positions.get(edge.childId);
                if (!src || !tgt) return null;
                const isHighlighted =
                  activeId === edge.parentId || activeId === edge.childId ||
                  activePathAndSubtree.has(edge.parentId) || activePathAndSubtree.has(edge.childId) ||
                  activeDagAncestors.has(edge.parentId) || activeDagAncestors.has(edge.childId);

                // Prefer D3-generated path when both d3 nodes are available and not compact
                const srcD3 = findD3NodeById(edge.parentId)
                const tgtD3 = findD3NodeById(edge.childId)
                if (viewMode !== 'compact' && srcD3 && tgtD3) {
                  const path = linkGenerator({ source: srcD3, target: tgtD3 })
                  return (
                    <path
                      key={`cross-${edge.parentId}-${edge.childId}`}
                      d={path ?? ''}
                      stroke="#f59e0b"
                      fill="none"
                      strokeWidth={isHighlighted ? 2 : 1.5}
                      strokeDasharray="6 3"
                      style={{ opacity: isHighlighted ? 0.9 : 0.2, transition: `opacity ${OPACITY_MS}ms` }}
                      aria-label={`Secondary link from ${edge.parentId} to ${edge.childId}`}
                    />
                  )
                }

                // Fallback: compute endpoint positions manually (compact or missing nodes)
                const tgtNode = findVisibleOrClusterNode(edge.childId);
                const tgtDisplayY = tgtNode ? getDisplayY(tgtNode) : tgt.y;
                const endX = viewMode === 'compact' ? tgtDisplayY + 8 : tgt.y;

                return (
                  <path
                    key={`cross-${edge.parentId}-${edge.childId}`}
                    d={linkPath(src.y, src.x, endX, tgt.x)}
                    stroke="#f59e0b"
                    fill="none"
                    strokeWidth={isHighlighted ? 2 : 1.5}
                    strokeDasharray="6 3"
                    style={{ opacity: isHighlighted ? 0.9 : 0.2, transition: `opacity ${OPACITY_MS}ms` }}
                    aria-label={`Secondary link from ${edge.parentId} to ${edge.childId}`}
                  />
                );
              })}
            </g>
          )}
          <g className="links">
            {links.map((l) => {
              const s = positions.get(l.source.data.id)!
              const t = positions.get(l.target.data.id)!
              const dim = activeId && !activePathAndSubtree.has(l.source.data.id) && !activePathAndSubtree.has(l.target.data.id) && !activeDagAncestors.has(l.source.data.id) && !activeDagAncestors.has(l.target.data.id)

              // Try to find the D3 node so we can compute displayY; fallback to raw positions.
              const srcD3 = findD3NodeById(l.source.data.id)
              const tgtD3 = findD3NodeById(l.target.data.id)

              if (viewMode !== 'compact' && srcD3 && tgtD3) {
                const path = linkGenerator({ source: srcD3, target: tgtD3 })
                return (
                  <path
                    key={`${l.source.data.id}-${l.target.data.id}`}
                    d={path ?? ''}
                    stroke="#9ca3af"
                    fill="none"
                    strokeWidth={1}
                    style={{ opacity: dim ? 0.18 : 0.55, transition: `d ${ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${OPACITY_MS}ms` }}
                  />
                )
              }

              // Fallback / compact mode: use existing elbow / cubic logic with explicit coords
              const srcNode = srcD3 ?? findVisibleOrClusterNode(l.source.data.id)
              const tgtNode = tgtD3 ?? findVisibleOrClusterNode(l.target.data.id)
              const sx = srcNode ? getDisplayY(srcNode) : s.y
              const tx = tgtNode ? getDisplayY(tgtNode) : t.y
              return (
                <path
                  key={`${l.source.data.id}-${l.target.data.id}`}
                  d={linkPath(sx, s.x, tx, t.x)}
                  stroke="#9ca3af"
                  fill="none"
                  strokeWidth={1}
                  style={{ opacity: dim ? 0.18 : 0.55, transition: `opacity ${OPACITY_MS}ms` }}
                />
              )
            })}
          </g>
          <g className="nodes">
            {visibleNodes.map((node) => {
              const p = positions.get(node.data.id)!
              const dim = activeId && !activePathAndSubtree.has(node.data.id) && !activeDagAncestors.has(node.data.id) && node.data.id !== activeId
              const color = colorFor(node as unknown as d3.HierarchyPointNode<PrunedNode>)
              const isCluster = Boolean(node.data.__cluster_for)
              const clusterFor = node.data.__cluster_for
              const finalIconChar = t(`nodes.${node.data.id}.iconChar`, { defaultValue: node.data.iconChar || '' })
              const finalIconFont = t(`nodes.${node.data.id}.iconFont`, { defaultValue: node.data.iconFont || 'sans-serif' })
              const displayY = getDisplayY(node)
              return (
                <g
                  key={node.data.id}
                  className={`node ${isCluster ? 'cluster' : ''}`}
                    style={{
                    transform: `translate(${displayY}px, ${p.x}px)`,
                    transition: `${NODE_TRANSITION}, opacity ${OPACITY_MS}ms`,
                    opacity: dim ? 0.25 : 1,
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const targetId = clusterFor || node.data.id
                    onToggleNode(targetId)
                  }}
                  onMouseEnter={isCluster ? () => setHovered(node.data.id) : undefined}
                  onMouseLeave={isCluster ? () => setHovered(null) : undefined}
                >
                  {isCluster ? (
                    <>
                      <circle r={viewMode === 'compact' ? 8 : 12} fill="#fff" stroke={color} strokeWidth={2} strokeDasharray="3 2" />
                      {hovered === node.data.id ? (
                        <text x={viewMode === 'compact' ? 12 : 18} y={5} fontSize={12} style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            {node.data.__cluster_for ? t('cluster_items', { count: node.data.__cluster_count }) : (
                              <HighlightSVGText
                                text={t(`nodes.${node.data.id}.name`, { defaultValue: node.data.name || '' })}
                                query={searchQuery}
                              />
                            )}
                        </text>
                      ) : null}
                    </>
                  ) : viewMode === 'compact' ? (
                    <>
                      {/* Multi-parent indicator - amber ring for nodes with multiple parents */}
                      {dagData && hasMultipleParents(dagData, node.data.id) && (
                        <circle r={8} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 1.5" opacity={0.7} />
                      )}
                      <rect x={-8} y={-10} width={16} height={20} rx={4} fill={color} stroke="#fff" strokeWidth={1.5} />
                      {node.data.image ? (
                        <image className="icon-img" href={node.data.image} x={-6} y={-6} width={12} height={12} />
                      ) : finalIconChar ? (
                        <text
                          className="icon-char"
                          x={0}
                          y={3.5}
                          textAnchor="middle"
                          fill="white"
                          fontSize={11}
                          fontFamily={finalIconFont}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                          aria-hidden="true"
                        >
                          {finalIconChar}
                        </text>
                      ) : null}
                      <text x={14} y={4} fontSize={13} textAnchor="start" style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                          {node.data.__cluster_for ? t('cluster_items', { count: node.data.__cluster_count }) : (
                            <HighlightSVGText
                              text={t(`nodes.${node.data.id}.name`, { defaultValue: node.data.name || '' })}
                              query={searchQuery}
                            />
                          )}
                      </text>
                      {node.data.attachments && node.data.attachments.length > 0 && (
                        <g transform="translate(10, 8)">
                          <path
                            d="M-3,-4 H0.75 L3,-1.75 V4 H-3 Z M0.75,-4 V-1.75 H3"
                            fill="#fff"
                            stroke={color}
                            strokeWidth={1.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                    </>
                  ) : (
                    <>
                      <circle r={26} fill={color} stroke="#fff" strokeWidth={2} />
                      {node.data.image ? (
                        <image className="icon-img" href={node.data.image} x={0} y={0} width={32} height={32} />
                      ) : finalIconChar ? (
                        <text
                          className="icon-char"
                          x={0}
                          y={0}
                          textAnchor="start"
                          fill="white"
                          fontSize={28}
                          fontFamily={finalIconFont}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                          aria-hidden="true"
                        >
                          {finalIconChar}
                        </text>
                      ) : null}
                      <text x={node.children ? 0 : 36} y={node.children ? -34 : 6} fontSize={14} textAnchor={node.children ? 'middle' : 'start'} style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                          {node.data.__cluster_for ? t('cluster_items', { count: node.data.__cluster_count }) : (
                            <HighlightSVGText
                              text={t(`nodes.${node.data.id}.name`, { defaultValue: node.data.name || '' })}
                              query={searchQuery}
                            />
                          )}
                      </text>
                      {node.data.attachments && node.data.attachments.length > 0 && (
                        <g transform="translate(20, 20)">
                          <path
                            d="M-4.5,-6 H1 L4.5,-2.5 V6 H-4.5 Z M1,-6 V-2.5 H4.5"
                            fill="#fff"
                            stroke={color}
                            strokeWidth={1.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                    </>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      <Sidebar open={sidebarOpen} onClose={clearSelection} node={activeNode?.data} initialWidth={sidebarWidth} onWidthChange={(w) => setSidebarWidth(w)} />
    </div>
  )
}
