import React, { useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { useI18n } from '../i18n'
import { useTree } from '../context/TreeContext'
import type { TreeNode, PrunedNode } from '../types'
import { FALLBACK_COLOR } from '../types'
import { buildParentMap, getParents } from '../utils/dagUtils'
import Sidebar from './Sidebar'
import { useSidebar } from '../hooks/useSidebar'
import { ANIMATION_MS, CENTER_MARGIN, computeBounds, computeTransform, useTreeZoom } from '../hooks/useTreeZoom'
import { buildPrunedHierarchy } from '../utils/dagUtils'
import TreeLinks from './tree/TreeLinks'
import TreeNodesRenderer from './tree/TreeNodesRenderer'

type Props = {
  forwardedSvgRef?: React.RefObject<SVGSVGElement | null>
}

export default function TreeViz({ forwardedSvgRef }: Props) {
  const defaultSvgRef = useRef<SVGSVGElement | null>(null)
  const svgRef = forwardedSvgRef || defaultSvgRef
  const innerGroupRef = useRef<SVGGElement | null>(null)
  const { zoomRef, applyTransform } = useTreeZoom(svgRef, innerGroupRef)
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

  const parentMap = useMemo(() => {
    if (!dagData) return new Map<string, string[]>();
    return buildParentMap(dagData);
  }, [dagData]);

  const onToggleNode = useCallback((id: string, shouldSelect = true) => {
    const willOpen = !expanded.has(id)
    toggleNode(id);
    if (shouldSelect) setActiveId(id);
    if (willOpen || isFullyExpanded) requestForceCenter();
  }, [expanded, toggleNode, setActiveId, isFullyExpanded, requestForceCenter]);

  const { t, lang } = useI18n()
  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId);

  const nodeClickGuard = useRef<'node' | null>(null)

  const clearSelection = useCallback((_e?: React.MouseEvent) => {
    // If a node was just clicked, ignore the clearSelection event
    if (nodeClickGuard.current === 'node') {
      nodeClickGuard.current = null
      return
    }
    setSidebarOpen(false)
    setActiveId('')
  }, [setSidebarOpen, setActiveId])

  // Build pruned tree and preserve node metadata (color)
  const layoutRoot = useMemo(() => {
    // Build pruned hierarchy first
    const prunedRoot = buildPrunedHierarchy(data as TreeNode, expanded) as d3.HierarchyNode<PrunedNode>

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

    const treeLayout = d3.tree<PrunedNode>()
      .nodeSize(isCompact ? [32, 176] : [verticalSpacing, 220])
      .separation((a, b) => a.parent === b.parent ? 1 : (isCompact ? 1.1 : 1.4))

    return treeLayout(prunedRoot)
  }, [data, expanded, viewMode, t])

  const { positions, d3NodeMap } = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; depth: number }>()
    const d3NodeMap = new Map<string, d3.HierarchyPointNode<PrunedNode>>()
    layoutRoot.descendants().forEach((d) => {
      positions.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0, depth: d.depth })
      d3NodeMap.set(d.data.id, d as d3.HierarchyPointNode<PrunedNode>)
    })
    return { positions, d3NodeMap }
  }, [layoutRoot])

  const links = useMemo(() => {
    // Use D3's native links() produced from the hierarchy to avoid manual construction.
    // layoutRoot.links() returns objects with .source and .target nodes.
    return layoutRoot.links() as unknown as Array<d3.HierarchyPointLink<PrunedNode>>
  }, [layoutRoot])

  const treeNodeMap = useMemo(() => {
    const map = new Map<string, TreeNode>()
    function walk(node: TreeNode) {
      map.set(node.id, node)
      node.children?.forEach(walk)
    }
    walk(data)
    return map
  }, [data])

  const activePathAndSubtree = useMemo(() => {
    const set = new Set<string>()
    if (!activeId) return set
    const node = d3NodeMap.get(activeId)
    if (!node) return set

    let current: d3.HierarchyPointNode<PrunedNode> | null = node
    while (current) {
      set.add(current.data.id)
      current = current.parent
    }

    node.descendants().forEach((d) => set.add(d.data.id))
    return set
  }, [activeId, d3NodeMap])

  // All DAG ancestors (all parent chains) of the active node — used to highlight secondary paths
  const activeDagAncestors = useMemo(() => {
    const set = new Set<string>()
    if (!activeId || !dagData) return set
    const dd = dagData
    function dfsUp(id: string) {
      if (set.has(id)) return
      set.add(id)
      const parents = getParents(dd, id, parentMap)
      for (const p of parents) dfsUp(p)
    }
    dfsUp(activeId)
    return set
  }, [activeId, dagData, parentMap])

  const isInViewport = useCallback((id: string, margin = CENTER_MARGIN) => {
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
  }, [positions, sidebarOpen, sidebarWidth, svgRef])

  const activeIdRef = useRef<string>(activeId)
  useLayoutEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  // centerOn must be declared before the useEffect hooks that reference it,
  // so that ESLint can resolve the dependency correctly at static analysis time.
  const centerOn = useCallback((id: string, scale = 1) => {
    const svgEl = svgRef.current
    if (!svgEl || !zoomRef.current) return
    const p = positions.get(id)
    if (!p) return
    const rect = svgEl.getBoundingClientRect()
    const transform = computeTransform(p, null, rect, sidebarOpen ? sidebarWidth : 0, scale)
    applyTransform(transform)
  }, [positions, sidebarOpen, sidebarWidth, applyTransform, zoomRef])

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
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => centerIcons()).catch(() => {})
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
  }, [positions, lang])

  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--anim-ms', `${ANIMATION_MS}ms`)
    } catch (e) {
      // ignore (server-side rendering or restricted environment)
    }

    const svgEl = svgRef.current
    if (!svgEl) return

    const handleResize = () => {
      const currentActiveId = activeIdRef.current
      if (currentActiveId && !isInViewport(currentActiveId)) {
        const current = d3.zoomTransform(svgEl)
        centerOn(currentActiveId, current.k || 1)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [centerOn, isInViewport, svgRef])

  useEffect(() => {
    // recompute centering only when active changes or when forced
    const svgEl = svgRef.current
    if (!svgEl || !zoomRef.current) return

    if (!activeId) return

    const p = positions.get(activeId)
    if (!p) return

    const current = d3.zoomTransform(svgEl)
    const targetScale = Math.max(0.9, Math.min(1.6, current.k || 1))

    centerOn(activeId, targetScale)
    if (forceCenterOnActive) { clearForceCenter(); }
    // Intentional omission of other dependencies (refs and stable functions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, positions, sidebarOpen, sidebarWidth, forceCenterOnActive])

  useEffect(() => {
    // If sidebar state changes and we have an active node, ensure it remains centered
    const svgEl = svgRef.current
    if (svgEl && activeId && zoomRef.current) {
      const current = d3.zoomTransform(svgEl)
      centerOn(activeId, current.k || 1)
    }
    // Intentional omission: re-centering only on sidebar change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, sidebarWidth])

  const fitView = useCallback((duration: number = ANIMATION_MS) => {
    const svgEl = svgRef.current
    if (!svgEl || !layoutRoot || !zoomRef.current) return

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

    if (duration === 0) {
      applyTransform(transform, true)
    } else {
      applyTransform(transform)
    }
  }, [layoutRoot, positions, sidebarOpen, sidebarWidth, applyTransform, zoomRef])

  const lastResetRef = useRef<number>(0)
  const initialFitDone = useRef<boolean>(false)

  // Fit view on initial load and when viewMode changes
  useEffect(() => {
    if (!initialFitDone.current && layoutRoot && positions.size > 0 && zoomRef.current) {
      initialFitDone.current = true
      fitView(0)
    }
  }, [layoutRoot, positions, fitView, zoomRef])

  useEffect(() => {
    if (initialFitDone.current && layoutRoot && positions.size > 0) {
      fitView(ANIMATION_MS)
    }
    // fitView intentionally omitted from deps: this effect must only fire on viewMode change.
    // Including fitView (which depends on layoutRoot/positions) would trigger a full-tree
    // fit on every navigation, displacing nodes from their centered position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  useEffect(() => {
    if (resetViewTrigger > lastResetRef.current && layoutRoot && layoutRoot.descendants().length > 0) {
      lastResetRef.current = resetViewTrigger
      fitView()
    }
  }, [resetViewTrigger, layoutRoot, positions, sidebarOpen, sidebarWidth])

  const colorFor = useCallback((node: d3.HierarchyPointNode<PrunedNode>) => {
    const clusterFor = node.data.__cluster_for
    if (clusterFor) {
      const original = d3NodeMap.get(clusterFor)
      if (original) {
        if (original.data && original.data.color) return original.data.color
      }
      // fallback: try searching the original data source
      const src = treeNodeMap.get(clusterFor)
      if (src?.color) return src.color
    }
    let cur: d3.HierarchyPointNode<PrunedNode> | null = node
    while (cur) {
      if (cur.data.color) return cur.data.color
      cur = (cur.parent as d3.HierarchyPointNode<PrunedNode>) || null
    }
    return FALLBACK_COLOR
  }, [d3NodeMap, treeNodeMap]);

  const activeNode = d3NodeMap.get(activeId)

  return (
    <div
      className="viz-container"
      onClick={clearSelection}
    >
      <svg ref={svgRef} className="viz-svg">
        <g ref={innerGroupRef}>
          <TreeLinks
            layoutRoot={layoutRoot}
            links={links}
            crossEdges={crossEdges}
            d3NodeMap={d3NodeMap}
            activeId={activeId}
            activePathAndSubtree={activePathAndSubtree}
            activeDagAncestors={activeDagAncestors}
            viewMode={viewMode}
          />
          <TreeNodesRenderer
            layoutRoot={layoutRoot}
            activeId={activeId}
            activePathAndSubtree={activePathAndSubtree}
            activeDagAncestors={activeDagAncestors}
            viewMode={viewMode}
            dagData={dagData}
            parentMap={parentMap}
            searchQuery={searchQuery}
            onToggleNode={onToggleNode}
            setActiveId={setActiveId}
            colorFor={colorFor}
            nodeClickGuardRef={nodeClickGuard}
          />
        </g>
      </svg>

      <Sidebar open={sidebarOpen} onClose={clearSelection} node={activeNode?.data} initialWidth={sidebarWidth} onWidthChange={(w) => setSidebarWidth(w)} />
    </div>
  )
}