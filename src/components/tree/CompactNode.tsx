import { HighlightSVGText } from '../../utils/highlightSVG'
import type { PrunedNode } from '../TreeViz'

type Props = {
  node: PrunedNode & { x: number; y: number }
  color: string
  dagData: any
  searchQuery: string
  t: (key: string, opts?: any) => string
  hasMultipleParentsFn: (data: any, id: string) => boolean
  displayY: number
}

export function CompactNode({ node, color, dagData, searchQuery, t, hasMultipleParentsFn, displayY }: Props) {
  const finalIconChar = t(`nodes.${node.id}.iconChar`, { defaultValue: node.iconChar || '' })
  const finalIconFont = t(`nodes.${node.id}.iconFont`, { defaultValue: node.iconFont || 'sans-serif' })

  return (
    <g
      className="node"
      style={{
        transform: `translate(${displayY}px, ${node.x}px)`,
        transition: 'transform 1000ms cubic-bezier(.2,.8,.2,1), opacity 500ms',
        cursor: 'pointer',
      }}
    >
      {/* Multi-parent indicator - amber ring for nodes with multiple parents */}
      {dagData && hasMultipleParentsFn(dagData, node.id) && (
        <circle r={8} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 1.5" opacity={0.7} />
      )}
      <rect x={-8} y={-10} width={16} height={20} rx={4} fill={color} stroke="#fff" strokeWidth={1.5} />
      {node.image ? (
        <image className="icon-img" href={node.image} x={-6} y={-6} width={12} height={12} />
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
        <HighlightSVGText
          text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })}
          query={searchQuery}
        />
      </text>
      {node.attachments && node.attachments.length > 0 && (
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
    </g>
  )
}