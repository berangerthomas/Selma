import { HighlightSVGText } from '../../utils/highlightSVG'
import type { PrunedNode } from '../../types'
import { useI18n } from '../../i18n'

type Props = {
  node: PrunedNode & { x: number; y: number }
  color: string
  searchQuery: string
  hasChildren: boolean
}

export function OrganicNode({ node, color, searchQuery, hasChildren }: Props) {
  const { t } = useI18n()
  const finalIconChar = t(`nodes.${node.id}.iconChar`, { defaultValue: node.iconChar || '' })
  const finalIconFont = t(`nodes.${node.id}.iconFont`, { defaultValue: node.iconFont || 'sans-serif' })

  // No transform here — the parent <g> in TreeViz already handles translate(displayY, p.x)
  return (
    <g className="node">
      <circle r={26} fill={color} stroke="#fff" strokeWidth={2} />
      {node.image ? (
        <image className="icon-img" href={node.image} x={0} y={0} width={32} height={32} />
      ) : finalIconChar ? (
        <text
          className="icon-char"
          x={0}
          y={0}
          textAnchor="start"
          fill="white"
          fontSize={28}
          fontFamily={finalIconFont}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          aria-hidden="true"
        >
          {finalIconChar}
        </text>
      ) : null}
      <text
        x={hasChildren ? 0 : 36}
        y={hasChildren ? -34 : 6}
        fontSize={14}
        textAnchor={hasChildren ? 'middle' : 'start'}
        style={{ userSelect: 'none', paintOrder: 'stroke', stroke: 'var(--panel-bg)', fill: 'var(--text-main)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }}
      >
        <HighlightSVGText
          text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })}
          query={searchQuery}
        />
      </text>
      {node.attachments && node.attachments.length > 0 && (
        <g transform="translate(20, 20)">
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
