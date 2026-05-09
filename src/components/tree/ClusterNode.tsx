import { useState } from 'react'
import { HighlightSVGText } from '../../utils/highlightSVG'
import type { PrunedNode } from '../TreeViz'

type Props = {
  node: PrunedNode & { x: number; y: number }
  color: string
  viewMode: 'organic' | 'compact' | 'list' | 'columns'
  searchQuery: string
  t: (key: string, opts?: any) => string
  onToggle: (id: string) => void
}

export function ClusterNode({ node, color, viewMode, searchQuery, t, onToggle }: Props) {
  const [hovered, setHovered] = useState(false)
  const clusterFor = node.__cluster_for
  const radius = viewMode === 'compact' ? 8 : 12

  // No transform here — the parent <g> in TreeViz already handles translate(displayY, p.x)
  return (
    <g
      className="node cluster"
      onClick={(e) => {
        e.stopPropagation()
        if (clusterFor) onToggle(clusterFor)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <circle r={radius} fill="#fff" stroke={color} strokeWidth={2} strokeDasharray="3 2" />
      {hovered && (
        <text
          x={viewMode === 'compact' ? 12 : 18}
          y={5}
          fontSize={12}
          style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
        >
          {clusterFor ? t('cluster_items', { count: node.__cluster_count }) : (
            <HighlightSVGText
              text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })}
              query={searchQuery}
            />
          )}
        </text>
      )}
    </g>
  )
}
