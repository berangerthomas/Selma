import React from 'react'
import { HighlightSVGText } from '../../utils/highlightSVG'
import type { PrunedNode, Orientation } from '../../types'
import { useI18n } from '../../i18n'

type Props = {
  node: PrunedNode & { x: number; y: number }
  color: string
  searchQuery: string
  hasChildren: boolean
  nodeRadius: number
  nodeShape: 'circle' | 'rect'
  orientation: Orientation
}

function OrganicNode({ node, color, searchQuery, hasChildren, nodeRadius, nodeShape, orientation }: Props) {
  const { t } = useI18n()
  const finalIconChar = t(`nodes.${node.id}.iconChar`, { defaultValue: node.iconChar || '' })
  const finalIconFont = t(`nodes.${node.id}.iconFont`, { defaultValue: node.iconFont || 'sans-serif' })

  // No transform here — the parent <g> in TreeViz already handles translate(displayY, p.x)
  return (
    <g className="node">
      {nodeShape === 'circle' ? (
        <circle r={nodeRadius} fill={color} stroke="#fff" strokeWidth={2} />
      ) : (
        (() => {
          const rectW = nodeRadius * 2.0
          const rectH = nodeRadius * 1.1
          const rx = Math.max(4, Math.round(nodeRadius * 0.12))
          return (
            <rect x={-rectW / 2} y={-rectH / 2} width={rectW} height={rectH} rx={rx} fill={color} stroke="#fff" strokeWidth={2} />
          )
        })()
      )}
      {node.image ? (
        <image className="icon-img" href={node.image} x={-(nodeRadius * 1.2) / 2} y={-(nodeRadius * 1.2) / 2} width={nodeRadius * 1.2} height={nodeRadius * 1.2} />
      ) : finalIconChar ? (
        <text
          className="icon-char"
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={nodeShape === 'rect' ? nodeRadius * 0.9 : nodeRadius * 1.1}
          fontFamily={finalIconFont}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          aria-hidden="true"
        >
          {finalIconChar}
        </text>
      ) : null}
      {hasChildren ? (
        // Text above the node (centered horizontally)
        <text
          x={0}
          y={nodeShape === 'rect' ? -(nodeRadius * 0.55 + 8) : -(nodeRadius + 8)}
          fontSize={14}
          textAnchor="middle"
          style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
        >
          <HighlightSVGText
            text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })}
            query={searchQuery}
          />
        </text>
      ) : orientation === 'vertical' ? (
        // Leaf nodes in vertical mode: text below, centered horizontally
        <text
          x={0}
          y={nodeShape === 'rect' ? nodeRadius * 0.55 + 14 : nodeRadius + 16}
          fontSize={14}
          textAnchor="middle"
          style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
        >
          <HighlightSVGText
            text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })}
            query={searchQuery}
          />
        </text>
      ) : (
        // Leaf nodes in horizontal mode: text to the right, vertically centered
        <text
          x={nodeShape === 'rect' ? nodeRadius + 4 : nodeRadius + 10}
          y={0}
          dominantBaseline="central"
          fontSize={14}
          textAnchor="start"
          style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
        >
          <HighlightSVGText
            text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })}
            query={searchQuery}
          />
        </text>
      )}
      {node.attachments && node.attachments.length > 0 && (
        <g transform={`translate(${nodeRadius * 0.8}, ${nodeRadius * 0.8})`}>
          <path
            d="M-4.5,-6 H1 L4.5,-2.5 V6 H-4.5 Z M1,-6 V-2.5 H4.5"
            fill="#fff"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  )
}

export default React.memo(OrganicNode)