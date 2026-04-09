import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useI18n } from '../i18n'
import { useTree } from '../context/TreeContext'
import type { TreeNode } from '../types'
import { findNodeById } from '../utils/treeUtils'
import Sidebar from './Sidebar'

type Props = {}

const COLLAPSE_DEPTH = 1
const LEFT_FRACTION = 0.32
const CENTER_MARGIN = 120
const NODE_TRANSITION = 'transform 450ms cubic-bezier(.2,.8,.2,1)'

function computeTransform(
  nodePos: { x: number, y: number },
  subtreeExtents: { minX: number, maxX: number, minY: number, maxY: number } | null,
  svgRect: DOMRect | { width: number, height: number },
  sidebarOffset: number,
  forcedScale?: number
): d3.ZoomTransform {
  const effectiveWidth = svgRect.width - sidebarOffset
  const topOcclusion = 50 // Toolbar on top
  const bottomOcclusion = 80 // Breadcrumb on bottom
  const availableHeight = svgRect.height - topOcclusion - bottomOcclusion
  
  let targetScale = forcedScale || 1

  if (subtreeExtents && !forcedScale) {
    const visualMinY = subtreeExtents.minY - 30
    const visualMaxY = subtreeExtents.maxY + 400
    const visualMinX = subtreeExtents.minX - 5
    const visualMaxX = subtreeExtents.maxX + 5

    const paddingX = 5
    const paddingY = 5
    
    const maxDistLeft = Math.max(1, nodePos.y - visualMinY)
    const maxDistRight = Math.max(1, visualMaxY - nodePos.y)
    const maxDistTop = Math.max(1, nodePos.x - visualMinX)
    const maxDistBottom = Math.max(1, visualMaxX - nodePos.x)

    const scaleLeft = (effectiveWidth * LEFT_FRACTION - paddingX) / maxDistLeft
    const scaleRight = (effectiveWidth * (1 - LEFT_FRACTION) - paddingX) / maxDistRight
    const scaleTop = (availableHeight / 2 - paddingY) / maxDistTop
    const scaleBottom = (availableHeight / 2 - paddingY) / maxDistBottom

    const proposed = Math.min(scaleLeft, scaleRight, scaleTop, scaleBottom)
    const MIN_SCALE = 0.05
    const MAX_SCALE = 1.3
    targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, proposed))
  }
  
  const tx = effectiveWidth * LEFT_FRACTION - nodePos.y * targetScale
  const ty = (topOcclusion + availableHeight / 2) - nodePos.x * targetScale
  
  return d3.zoomIdentity.translate(tx, ty).scale(targetScale)
}

export default function TreeViz({}: Props = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const zoomRef = useRef<any>(null)
  const { 
    data, 
    expanded, 
    activeId, 
    forceCenterOnActive, 
    resetViewTrigger,
    setActiveId, 
    clearForceCenter,
    toggleNode,
    requestForceCenter
  } = useTree()

  const onToggleNode = (id: string) => {
    const willOpen = !expanded.has(id);
    toggleNode(id);
    setTimeout(() => {
      setActiveId(id);
      if (willOpen) requestForceCenter();
    }, 80);
  };

  const lastActiveRef = useRef<string | null>(null)
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity)
  const { t, lang } = useI18n()
  const lastLangRef = useRef<string>(lang)
  const [hovered, setHovered] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(420)

  // Build pruned tree and preserve node metadata (color)
  const layoutRoot = useMemo(() => {
    interface PrunedNode extends Omit<TreeNode, 'children'> {
      __cluster_for?: string
      __cluster_count?: number
      children?: PrunedNode[]
    }

    function totalCount(n: TreeNode): number {
      if (!n || !n.children || n.children.length === 0) return 0
      // Count only immediate/direct children, not all descendants
      return n.children.length
    }

    function prune(node: TreeNode, depth = 0): PrunedNode | null {
      if (node.id === 'legend') return null
      const hasChildren = Array.isArray(node.children) && node.children.length > 0
      const base: PrunedNode = { id: node.id, name: node.name, description: node.description }
      if (node.color) base.color = node.color
      
      if (!hasChildren) return base
      
      if (depth >= COLLAPSE_DEPTH && !(expanded && expanded.has(node.id))) {
        const count = totalCount(node)
        const cluster: PrunedNode = { id: `${node.id}__cluster`, name: '', description: '', __cluster_for: node.id, __cluster_count: count }
        return { ...base, children: [cluster] }
      }
      
      const children = (node.children || []).map((c: TreeNode) => prune(c, depth + 1)).filter((c): c is PrunedNode => c !== null)
      if (children.length === 0) return base
      return { ...base, children }
    }

    const pruned = prune(data as TreeNode, 0)
    const root = d3.hierarchy(pruned as PrunedNode) as d3.HierarchyPointNode<PrunedNode>
    return d3.tree<PrunedNode>().nodeSize([60, 220])(root)
  }, [data, expanded])

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; depth: number }>()
    layoutRoot.descendants().forEach((d) => {
      map.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0, depth: d.depth })
    })
    return map
  }, [layoutRoot])

  const visibleNodes = useMemo(() => layoutRoot.descendants(), [layoutRoot])

  const links = useMemo(() => {
    const res: Array<{ source: d3.HierarchyPointNode<TreeNode>; target: d3.HierarchyPointNode<TreeNode> }> = []
    for (const node of visibleNodes) {
      if (node.parent) res.push({ source: node.parent as d3.HierarchyPointNode<TreeNode>, target: node })
    }
    return res
  }, [visibleNodes])

  function findD3NodeById(id: string) {
    return layoutRoot.descendants().find((d) => d.data.id === id) as d3.HierarchyPointNode<any> | undefined
  }


  function collectSubtreeIds(id: string) {
    const node = findD3NodeById(id)
    const set = new Set<string>()
    if (!node) return set
    node.descendants().forEach((d) => set.add(d.data.id))
    return set
  }

  const activeSubtree = useMemo(() => collectSubtreeIds(activeId), [activeId, layoutRoot])

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
  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.05, 4]).on('zoom', (event) => setTransform(event.transform))
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
    // Exécution unique au montage, les dépendances dynamiques sont accédées via hooks/refs
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
    if (!forceCenterOnActive && lastActiveRef.current === activeId) return

    const p = positions.get(activeId)
    if (!p) return

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    let count = 0
    activeSubtree.forEach((id) => {
      const pos = positions.get(id)
      if (!pos) return
      count++
      if (pos.x < minX) minX = pos.x
      if (pos.x > maxX) maxX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.y > maxY) maxY = pos.y
    })

    if (count <= 1) {
      if (!isInViewport(activeId) || forceCenterOnActive) {
        const current = d3.zoomTransform(svgEl)
        const targetScale = Math.max(0.9, Math.min(1.6, current.k || 1))
        centerOn(activeId, targetScale)
      }
      lastActiveRef.current = activeId
      if (forceCenterOnActive) { clearForceCenter(); }
      return
    }

    const extents = { minX, maxX, minY, maxY }
    const rect = svgEl.getBoundingClientRect()
    const transform = computeTransform(p, extents, rect, sidebarOpen ? sidebarWidth : 0)

    d3.select(svgEl).transition().duration(650).call(zoomRef.current.transform as any, transform)
    lastActiveRef.current = activeId
    if (forceCenterOnActive) { clearForceCenter(); }
    // Désactivation intentionnelle des autres dépendances (refs et fonctions stables)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, positions, sidebarOpen, sidebarWidth, activeSubtree, forceCenterOnActive])

  useEffect(() => {
    if (!sidebarOpen) return
    const svgEl = svgRef.current
    if (svgEl && !isInViewport(activeId)) {
      const current = d3.zoomTransform(svgEl)
      centerOn(activeId, current.k || 1)
    }
    // Désactivation intentionnelle : recentrage uniquement au changement de la sidebar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, sidebarWidth])

  const lastResetRef = useRef<number>(0)

  useEffect(() => {
    if (resetViewTrigger > lastResetRef.current && layoutRoot && layoutRoot.descendants().length > 0) {
      lastResetRef.current = resetViewTrigger
      const svgEl = svgRef.current
      if (!svgEl) return
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      layoutRoot.descendants().forEach(node => {
        const p = positions.get(node.data.id)
        if (!p) return
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      })
      const rootPos = positions.get(layoutRoot.data.id)
      if (!rootPos) return
      
      const extents = { minX, maxX, minY, maxY }
      const rect = svgEl.getBoundingClientRect()
      const transform = computeTransform(rootPos, extents, rect, sidebarOpen ? sidebarWidth : 0)

      d3.select(svgEl).transition().duration(650).call(zoomRef.current.transform as any, transform)
    }
  }, [resetViewTrigger, layoutRoot, positions, sidebarOpen, sidebarWidth])

  function centerOn(id: string, scale = 1) {
    const svgEl = svgRef.current
    if (!svgEl) return
    const p = positions.get(id)
    if (!p) return
    const rect = svgEl.getBoundingClientRect()
    const transform = computeTransform(p, null, rect, sidebarOpen ? sidebarWidth : 0, scale)
    d3.select(svgEl).transition().duration(650).call(zoomRef.current.transform as any, transform)
  }

  function colorFor(node: d3.HierarchyPointNode<TreeNode>) {
    const clusterFor = (node.data as any).__cluster_for
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
    let cur: d3.HierarchyPointNode<TreeNode> | null = node
    while (cur) {
      if (cur.data.color) return cur.data.color
      cur = (cur.parent as d3.HierarchyPointNode<TreeNode>) || null
    }
    return '#6b7280'
  }

  function linkPath(sx: number, sy: number, tx: number, ty: number) {
    const dx = (tx - sx) / 2
    return `M${sx},${sy}C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`
  }

  const activeNode = findD3NodeById(activeId)

  return (
    <div
      className="viz-container"
      onClick={() => {
        setSidebarOpen(false)
        setActiveId('');
      }}
    >
      <svg ref={svgRef} className="viz-svg" viewBox="0 0 1200 800">
        <g transform={transform.toString()}>
          <g className="links">
            {links.map((l) => {
              const s = positions.get(l.source.data.id)!
              const t = positions.get(l.target.data.id)!
              const dim = activeId && !activeSubtree.has(l.source.data.id) && !activeSubtree.has(l.target.data.id)
              return (
                <path
                  key={`${l.source.data.id}-${l.target.data.id}`}
                  d={linkPath(s.y, s.x, t.y, t.x)}
                  stroke="#9ca3af"
                  fill="none"
                  strokeWidth={1}
                  style={{ opacity: dim ? 0.18 : 0.55, transition: 'opacity 300ms' }}
                />
              )
            })}
          </g>
          <g className="nodes">
            {visibleNodes.map((node) => {
              const p = positions.get(node.data.id)!
              const dim = activeId && !activeSubtree.has(node.data.id) && node.data.id !== activeId
              const color = colorFor(node)
              const isCluster = Boolean((node.data as any).__cluster_for)
              const clusterFor = (node.data as any).__cluster_for
              return (
                <g
                  key={node.data.id}
                  className={`node ${isCluster ? 'cluster' : ''}`}
                  style={{
                    transform: `translate(${p.y}px, ${p.x}px)`,
                    transition: `${NODE_TRANSITION}, opacity 300ms`,
                    opacity: dim ? 0.25 : 1,
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const targetId = clusterFor || node.data.id
                    onToggleNode(targetId)
                    if (!clusterFor) {
                      if (activeId === targetId && sidebarOpen) setSidebarOpen(false)
                      else setSidebarOpen(true)
                    }
                  }}
                  onMouseEnter={isCluster ? () => setHovered(node.data.id) : undefined}
                  onMouseLeave={isCluster ? () => setHovered(null) : undefined}
                >
                  {isCluster ? (
                    <>
                      <circle r={12} fill="#fff" stroke={color} strokeWidth={2} strokeDasharray="3 2" />
                      {hovered === node.data.id ? (
                        <text x={18} y={5} fontSize={12} style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                          {node.data.__cluster_for ? t('cluster_items', { count: node.data.__cluster_count }) : t(`nodes.${node.data.id}.name`, { defaultValue: node.data.name })}
                        </text>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <circle r={26} fill={color} stroke="#fff" strokeWidth={2} />
                      <text x={node.children ? 0 : 36} y={node.children ? -34 : 6} fontSize={14} textAnchor={node.children ? 'middle' : 'start'} style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                        {node.data.__cluster_for ? t('cluster_items', { count: node.data.__cluster_count }) : t(`nodes.${node.data.id}.name`, { defaultValue: node.data.name })}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} node={activeNode?.data} initialWidth={sidebarWidth} onWidthChange={(w) => setSidebarWidth(w)} />
    </div>
  )
}
