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
  displayY: number
}

export function ClusterNode({ node, color, viewMode, searchQuery, t, onToggle, displayY }: Props) {
  const [hovered, setHovered] = useState(false)
  const clusterFor = node.__cluster_for
  const radius = viewMode === 'compact' ? 8 : 12

  return (
    <g
      className="node cluster"
      style={{
        transform: `translate(${displayY}px, ${node.x}px)`,
        transition: 'transform 1000ms cubic-bezier(.2,.8,.2,1), opacity 500ms',
        cursor: 'pointer',
      }}
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