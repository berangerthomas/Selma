import React, { useCallback, useMemo } from 'react'
import type * as d3 from 'd3'
import type { PrunedNode, ViewMode, NodeShape } from '../../types'
import { NODE_TRANSITION, OPACITY_MS } from '../../hooks/useTreeZoom'
import ClusterNode from './ClusterNode'
import OrganicNode from './OrganicNode'

type Props = {
  layoutRoot: d3.HierarchyPointNode<PrunedNode>
  activeId: string
  activePathAndSubtree: Set<string>
  activeDagAncestors: Set<string>
  viewMode: ViewMode
  searchQuery: string
  onToggleNode: (id: string, shouldSelect?: boolean) => void
  setActiveId: (id: string) => void
  colorFor: (node: d3.HierarchyPointNode<PrunedNode>) => string
  nodeClickGuardRef: React.MutableRefObject<'node' | null>
  nodeRadius: number
  nodeShape: NodeShape
}

function TreeNodesRenderer({
  layoutRoot,
  activeId,
  activePathAndSubtree,
  activeDagAncestors,
  viewMode,
  searchQuery,
  onToggleNode,
  setActiveId,
  colorFor,
  nodeClickGuardRef,
  nodeRadius,
  nodeShape
}: Props) {
  const visibleNodes = useMemo(() => layoutRoot.descendants(), [layoutRoot])

  const getDisplayY = useCallback((node: d3.HierarchyPointNode<PrunedNode>): number => {
    return node.y
  }, [])

  return (
    <g className="nodes">
      {visibleNodes.map((node) => {
        const pX = node.x ?? 0
        const displayY = getDisplayY(node)
        const dim = !!activeId && !activePathAndSubtree.has(node.data.id) && !activeDagAncestors.has(node.data.id) && node.data.id !== activeId
        const color = colorFor(node)
        const isCluster = Boolean(node.data.__cluster_for)

        return (
          <g
            key={node.data.id}
            className={`node ${isCluster ? 'cluster' : ''}`}
            style={{
              transform: `translate(${displayY}px, ${pX}px)`,
              transition: `${NODE_TRANSITION}, opacity ${OPACITY_MS}ms`,
              opacity: dim ? 0.25 : 1,
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation()
              nodeClickGuardRef.current = 'node'
              if (!isCluster) {
                onToggleNode(node.data.id)
              }
            }}
          >
            {isCluster ? (
              <ClusterNode
                node={{ ...node.data, x: pX, y: displayY }}
                color={color}
                viewMode={viewMode}
                searchQuery={searchQuery}
                onToggle={onToggleNode}
                setActiveId={setActiveId}
                nodeClickGuardRef={nodeClickGuardRef}
                nodeRadius={nodeRadius}
                nodeShape={nodeShape}
              />
            ) : (
              <OrganicNode
                node={{ ...node.data, x: pX, y: displayY }}
                color={color}
                searchQuery={searchQuery}
                hasChildren={!!node.children}
                nodeRadius={nodeRadius}
                nodeShape={nodeShape}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}

export default React.memo(TreeNodesRenderer)