import React, { useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import type { CrossEdge, PrunedNode, ViewMode, NodeShape, Orientation } from '../../types'
import { ANIMATION_MS, OPACITY_MS } from '../../hooks/useTreeZoom'

type Props = {
  layoutRoot: d3.HierarchyPointNode<PrunedNode>
  links: Array<d3.HierarchyPointLink<PrunedNode>>
  crossEdges: CrossEdge[]
  d3NodeMap: Map<string, d3.HierarchyPointNode<PrunedNode>>
  activeId: string
  activePathAndSubtree: Set<string>
  activeDagAncestors: Set<string>
  viewMode: ViewMode
  nodeShape: NodeShape
  nodeHalfWidth: number
  orientation: Orientation
}

function TreeLinks({
  layoutRoot,
  links,
  crossEdges,
  d3NodeMap,
  activeId,
  activePathAndSubtree,
  activeDagAncestors,
  nodeShape,
  nodeHalfWidth,
  orientation
}: Props) {
  const descendants = useMemo(() => layoutRoot.descendants(), [layoutRoot])

  const findVisibleOrClusterNode = useCallback((id: string) => {
    const direct = d3NodeMap.get(id)
    if (direct) return direct

    const cluster = d3NodeMap.get(`${id}__cluster`)
    if (cluster) return cluster

    return descendants.find((node) => node.data.__cluster_for === id)
  }, [d3NodeMap, descendants])

  const getDisplayX = useCallback((node: d3.HierarchyPointNode<PrunedNode>): number => {
    return node.x
  }, [])
  const getDisplayY = useCallback((node: d3.HierarchyPointNode<PrunedNode>): number => {
    return node.y
  }, [])

  const linkPath = useCallback((sourceX: number, sourceY: number, targetX: number, targetY: number) => {
    if (nodeShape === 'rect') {
      if (orientation === 'vertical') {
        const midY = sourceY + (targetY - sourceY) / 2
        return `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`
      }
      const midX = sourceX + (targetX - sourceX) / 2
      return `M${sourceX},${sourceY} L${midX},${sourceY} L${midX},${targetY} L${targetX},${targetY}`
    }

    const dx = (targetX - sourceX) / 2
    const dy = (targetY - sourceY) / 2
    if (orientation === 'vertical') {
      return `M${sourceX},${sourceY}C${sourceX},${sourceY + dy} ${targetX},${targetY - dy} ${targetX},${targetY}`
    }
    return `M${sourceX},${sourceY}C${sourceX + dx},${sourceY} ${targetX - dx},${targetY} ${targetX},${targetY}`
  }, [nodeShape, orientation])

  const linkGenerator = useMemo(() => {
    if (orientation === 'vertical') {
      return d3
        .linkVertical<d3.HierarchyPointLink<PrunedNode>, d3.HierarchyPointNode<PrunedNode>>()
        .x((d) => d.x)
        .y((d) => d.y)
    }
    return d3
      .linkHorizontal<d3.HierarchyPointLink<PrunedNode>, d3.HierarchyPointNode<PrunedNode>>()
      .x((d) => d.y)
      .y((d) => d.x)
  }, [orientation])

  return (
    <g className="links">
      {crossEdges.map((edge) => {
        const src = d3NodeMap.get(edge.parentId)
        const tgt = d3NodeMap.get(edge.childId)
        if (!src || !tgt) return null

        const isHighlighted =
          activeId === edge.parentId || activeId === edge.childId ||
          activePathAndSubtree.has(edge.parentId) || activePathAndSubtree.has(edge.childId) ||
          activeDagAncestors.has(edge.parentId) || activeDagAncestors.has(edge.childId)

        const tgtNode = findVisibleOrClusterNode(edge.childId)
        // linkPath expects (screenX, screenY)
        // Horizontal: screenX = d3.y (depth), screenY = d3.x (orthogonal)
        // Vertical:   screenX = d3.x (depth), screenY = d3.y (orthogonal)
        // Source centered → use raw d3 coords mapped to screen
        const sx = orientation === 'vertical' ? src.x : src.y
        const sy = orientation === 'vertical' ? src.y : src.x
        // Target: depth + nodeHalfWidth offset on screenX, orthogonal unchanged on screenY
        const depth = tgtNode
          ? (orientation === 'vertical' ? tgtNode.x : tgtNode.y)
          : (orientation === 'vertical' ? tgt.x : tgt.y)
        const ortho = tgtNode
          ? (orientation === 'vertical' ? tgtNode.y : tgtNode.x)
          : (orientation === 'vertical' ? tgt.y : tgt.x)
        const tx = depth + nodeHalfWidth
        const ty = ortho

        return (
          <path
            key={`cross-${edge.parentId}-${edge.childId}`}
            d={linkPath(sx, sy, tx, ty)}
            stroke="#f59e0b"
            fill="none"
            strokeWidth={isHighlighted ? 2 : 1.5}
            strokeDasharray="6 3"
            style={{ opacity: isHighlighted ? 0.9 : 0.2, transition: `opacity ${OPACITY_MS}ms` }}
            aria-label={`Secondary link from ${edge.parentId} to ${edge.childId}`}
          />
        )
      })}

      {links.map((link) => {
        const sourceId = link.source.data.id
        const targetId = link.target.data.id
        const dim = !!activeId &&
          !activePathAndSubtree.has(sourceId) &&
          !activePathAndSubtree.has(targetId) &&
          !activeDagAncestors.has(sourceId) &&
          !activeDagAncestors.has(targetId)

        const srcD3 = d3NodeMap.get(sourceId)
        const tgtD3 = d3NodeMap.get(targetId)

        const srcNode = srcD3 ?? findVisibleOrClusterNode(sourceId)
        const tgtNode = tgtD3 ?? findVisibleOrClusterNode(targetId)

        if (nodeShape === 'circle' && srcD3 && tgtD3) {
          const path = linkGenerator({ source: srcD3, target: tgtD3 })
          return (
            <path
              key={`${sourceId}-${targetId}`}
              d={path ?? ''}
              stroke="#9ca3af"
              fill="none"
              strokeWidth={1}
              style={{ opacity: dim ? 0.18 : 0.55, transition: `d ${ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${OPACITY_MS}ms` }}
            />
          )
        }

        const sourceX = srcNode ? getDisplayY(srcNode) : link.source.y
        const targetX = tgtNode ? getDisplayY(tgtNode) : link.target.y
        const sourceY = srcNode ? getDisplayX(srcNode) : link.source.x
        const targetY = tgtNode ? getDisplayX(tgtNode) : link.target.x

        const lx = orientation === 'vertical' ? sourceY : sourceX
        const ly = orientation === 'vertical' ? sourceX : sourceY
        const rx = orientation === 'vertical' ? targetY : targetX
        const ry = orientation === 'vertical' ? targetX : targetY

        return (
          <path
            key={`${sourceId}-${targetId}`}
            d={linkPath(lx, ly, rx, ry)}
            stroke="#9ca3af"
            fill="none"
            strokeWidth={1}
            style={{ opacity: dim ? 0.18 : 0.55, transition: `d ${ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${OPACITY_MS}ms` }}
          />
        )
      })}
    </g>
  )
}

export default React.memo(TreeLinks)