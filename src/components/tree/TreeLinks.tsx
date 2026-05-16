import React, { useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import type { CrossEdge, PrunedNode, ViewMode } from '../../types'
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
}

function TreeLinks({
  layoutRoot,
  links,
  crossEdges,
  d3NodeMap,
  activeId,
  activePathAndSubtree,
  activeDagAncestors,
  viewMode
}: Props) {
  const descendants = useMemo(() => layoutRoot.descendants(), [layoutRoot])

  const findVisibleOrClusterNode = useCallback((id: string) => {
    const direct = d3NodeMap.get(id)
    if (direct) return direct

    const cluster = d3NodeMap.get(`${id}__cluster`)
    if (cluster) return cluster

    return descendants.find((node) => node.data.__cluster_for === id)
  }, [d3NodeMap, descendants])

  const getDisplayY = useCallback((node: d3.HierarchyPointNode<PrunedNode>): number => {
    if (viewMode !== 'compact' || !node.parent) return node.y
    return node.y - (node.y - node.parent.y) / 3
  }, [viewMode])

  const linkPath = useCallback((sourceX: number, sourceY: number, targetX: number, targetY: number) => {
    if (viewMode === 'compact') {
      const midX = sourceX + (targetX - sourceX) / 2
      return `M${sourceX},${sourceY} L${midX},${sourceY} L${midX},${targetY} L${targetX},${targetY}`
    }

    const dx = (targetX - sourceX) / 2
    return `M${sourceX},${sourceY}C${sourceX + dx},${sourceY} ${targetX - dx},${targetY} ${targetX},${targetY}`
  }, [viewMode])

  const linkGenerator = useMemo(() => {
    return d3
      .linkHorizontal<d3.HierarchyPointLink<PrunedNode>, d3.HierarchyPointNode<PrunedNode>>()
      .x((d) => d.y)
      .y((d) => d.x)
  }, [])

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

        if (viewMode !== 'compact') {
          const path = linkGenerator({ source: src, target: tgt })
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

        const tgtNode = findVisibleOrClusterNode(edge.childId)
        const tgtDisplayY = tgtNode ? getDisplayY(tgtNode) : tgt.y
        const endX = tgtDisplayY + 8

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

        if (viewMode !== 'compact' && srcD3 && tgtD3) {
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

        const srcNode = srcD3 ?? findVisibleOrClusterNode(sourceId)
        const tgtNode = tgtD3 ?? findVisibleOrClusterNode(targetId)
        const sourceX = srcNode ? getDisplayY(srcNode) : link.source.y
        const targetX = tgtNode ? getDisplayY(tgtNode) : link.target.y

        return (
          <path
            key={`${sourceId}-${targetId}`}
            d={linkPath(sourceX, link.source.x, targetX, link.target.x)}
            stroke="#9ca3af"
            fill="none"
            strokeWidth={1}
            style={{ opacity: dim ? 0.18 : 0.55, transition: `opacity ${OPACITY_MS}ms` }}
          />
        )
      })}
    </g>
  )
}

export default React.memo(TreeLinks)