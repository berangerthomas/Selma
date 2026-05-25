import React from 'react'
import { HighlightSVGText } from '../../utils/highlightSVG'
import type { PrunedNode } from '../../types'
import { useI18n } from '../../i18n'

type Props = {
  node: PrunedNode & { x: number; y: number }
  color: string
  viewMode: 'tree' | 'list' | 'columns'
  searchQuery: string
  onToggle: (id: string) => void
  setActiveId?: (id: string) => void
  nodeClickGuardRef?: React.MutableRefObject<'node' | null>
  nodeRadius: number
  nodeShape: 'circle' | 'rect'
}

function ClusterNode({ node, color, searchQuery, onToggle, setActiveId, nodeClickGuardRef, nodeRadius, nodeShape }: Props) {
  const { t } = useI18n()
  const count = node.__cluster_count ?? 2
  const r = nodeRadius * 0.65

  return (
    <g
      className="cluster-node"
      onClick={(e) => {
        e.stopPropagation()
        nodeClickGuardRef && (nodeClickGuardRef.current = 'node')
        // Expand the cluster by toggling the original node
        if (node.__cluster_for) {
          onToggle(node.__cluster_for)
          if (setActiveId) setActiveId(node.__cluster_for)
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {nodeShape === 'rect' ? (
        <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={4} fill={color} opacity={0.6} stroke="#fff" strokeWidth={1.5} />
      ) : (
        <circle r={r} fill={color} opacity={0.6} stroke="#fff" strokeWidth={2} />
      )}
      <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={12} fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        +{count}
      </text>
      <text
        x={nodeShape === 'rect' ? r + 8 : r + 6}
        y={0}
        dominantBaseline="central"
        fontSize={13}
        textAnchor="start"
        style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}
      >
        {/* Display the node name or a text next to the cluster. For instance :
        text={t(`nodes.${node.__cluster_for}.name`, { defaultValue: node.name || '' })} */}
        <HighlightSVGText
          text={t('', { defaultValue: node.name || '' })}
          query={searchQuery}
        />
      </text>
    </g>
  )
}

export default React.memo(ClusterNode)