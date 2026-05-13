import { HighlightSVGText } from '../../utils/highlightSVG'
import type { PrunedNode } from '../../types'
import { useI18n } from '../../i18n'

type Props = {
  node: PrunedNode & { x: number; y: number }
  color: string
  viewMode: 'organic' | 'compact' | 'list' | 'columns'
  searchQuery: string
  onToggle: (id: string) => void
  setActiveId?: (id: string) => void
  nodeClickGuardRef?: React.MutableRefObject<'node' | null>
}

export function ClusterNode({ node, color, viewMode, searchQuery, onToggle, setActiveId, nodeClickGuardRef }: Props) {
  const { t } = useI18n()
  const clusterFor = node.__cluster_for
  const radius = viewMode === 'compact' ? 8 : 12

  // No transform here — the parent <g> in TreeViz already handles translate(displayY, p.x)
  return (
    <g
      className="node cluster"
      onClick={(e) => {
        e.stopPropagation()
        if (clusterFor) {
          // Set guard BEFORE toggling to prevent clearSelection from
          // overriding the activeId on the viz-container.
          if (nodeClickGuardRef) nodeClickGuardRef.current = 'node'
          // Must select the node BEFORE toggling, in case the event
          // propagation reaches the outer <g>'s onClick and double-toggles.
          if (setActiveId) setActiveId(clusterFor)
          onToggle(clusterFor)
        }
      }}
    >
      <circle r={radius} fill="#fff" stroke={color} strokeWidth={2} strokeDasharray="3 2" />
      <text
        className="cluster-label"
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
    </g>
  )
}
