import React, { useRef, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useI18n } from '../../i18n';
import { HighlightMatch } from '../../utils/highlight';
import { getNodeDimensions } from '../../utils/nodeLayout';
import type { TaxonomyNodeData } from '../../types';

type Props = {
  data: TaxonomyNodeData;
};

const LABEL_TRUNCATE_WIDTH = 180;

function getLabelFontSize(nodeSize: number): number {
  return Math.max(11, Math.min(35, Math.round(11 + (nodeSize - 11) * 0.2)));
}

function NodeLabel({ text, query, style }: { text: string; query: string; style: React.CSSProperties }) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (labelRef.current) {
      setIsOverflowing(labelRef.current.scrollWidth > labelRef.current.clientWidth);
    }
  }, [text]);

  return (
    <div
      ref={labelRef}
      style={{ ...style, maxWidth: LABEL_TRUNCATE_WIDTH, overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={isOverflowing ? text : undefined}
    >
      <HighlightMatch text={text} query={query} />
    </div>
  );
}

function getLabelStyle(labelPosition: string, nodeSize: number): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    whiteSpace: 'nowrap',
    fontSize: getLabelFontSize(nodeSize),
    textShadow: '0 0 4px var(--panel-bg), 0 0 6px var(--panel-bg)',
    color: 'var(--text-main)',
    fontWeight: 500,
    pointerEvents: 'none',
  };

  const positions: Record<string, React.CSSProperties> = {
    top:    { bottom: '100%', marginBottom: 8, left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: '100%', marginTop: 8, left: '50%', transform: 'translateX(-50%)' },
    right:  { left: '100%', marginLeft: 10, top: '50%', transform: 'translateY(-50%)' },
    left:   { right: '100%', marginRight: 10, top: '50%', transform: 'translateY(-50%)' },
  };

  return { ...base, ...(positions[labelPosition] ?? positions.top) };
}

const TaxonomyNode = React.memo(function TaxonomyNode({ data }: Props) {
  const { t } = useI18n();
  const { nodeSize, nodeShape, labelPosition, color, isCluster, clusterCount } = data;

  const finalIconChar = t(`nodes.${data.id}.iconChar`, { defaultValue: data.iconChar || '' });
  const finalIconFont = t(`nodes.${data.id}.iconFont`, { defaultValue: data.iconFont || 'sans-serif' });
  const nodeName = isCluster ? '' : t(`nodes.${data.id}.name`, { defaultValue: data.name || '' });

  const radius = nodeSize; // scale equivalent
  const { width, height } = getNodeDimensions(nodeSize, nodeShape);

  const shapeClass = nodeShape === 'circle' ? 'rounded-full' : 'rounded-md';

  const sourcePosition = data.orientation === 'vertical' ? Position.Bottom : Position.Right;
  const targetPosition = data.orientation === 'vertical' ? Position.Top : Position.Left;

  const labelStyle = getLabelStyle(labelPosition, nodeSize);
  const ariaLabel = nodeName || data.name || `Node ${data.id}`;

  return (
    <div
      className={`relative flex items-center justify-center border-2 border-white shadow-sm ${shapeClass} cursor-pointer`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-expanded={data.hasChildren ? (data.isExpanded ? 'true' : 'false') : undefined}
      style={{
        width,
        height,
        backgroundColor: color,
      }}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="opacity-0 pointer-events-none"
      />

      {data.hasMultipleParents && !isCluster && (
        <div
          className={`absolute -inset-[3px] border-[1.5px] border-amber-500 border-dashed opacity-70 ${shapeClass}`}
        />
      )}

      {isCluster ? (
        <span className="text-white font-bold select-none text-xs">
          +{clusterCount}
        </span>
      ) : data.image ? (
        <img
          src={data.image}
          alt=""
          className="object-cover"
          style={{ width: radius * 1.2, height: radius * 1.2 }}
        />
      ) : finalIconChar ? (
        <span
          className="text-white select-none pointer-events-none"
          style={{
            fontFamily: finalIconFont,
            fontSize: nodeShape === 'rect' ? radius * 0.9 : radius * 1.1,
          }}
          aria-hidden="true"
        >
          {finalIconChar}
        </span>
      ) : null}

      {/* Label rendering */}
      {!isCluster && (
        <NodeLabel text={nodeName} query={data.searchQuery} style={labelStyle} />
      )}

      {/* Cluster text (if cluster) */}
      {isCluster && (
        <NodeLabel
          text={t('', { defaultValue: data.name || '' })}
          query={data.searchQuery}
          style={{
            position: 'absolute',
            ...(nodeShape === 'rect' ? { left: '100%', marginLeft: 8 } : { left: '100%', marginLeft: 6 }),
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            fontSize: Math.max(11, getLabelFontSize(nodeSize) - 1),
            textShadow: '0 0 4px var(--panel-bg), 0 0 6px var(--panel-bg)',
            color: 'var(--text-main)',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Attachments indicator */}
      {!isCluster && data.attachments && data.attachments.length > 0 && (
        <div
          className="absolute flex items-center justify-center bg-white rounded-full"
          style={{
            width: radius * 0.6,
            height: radius * 0.6,
            bottom: nodeShape === 'circle' ? 0 : -radius * 0.2,
            right: nodeShape === 'circle' ? 0 : -radius * 0.2,
            border: `1.5px solid ${color}`,
          }}
        >
          <svg viewBox="0 0 24 24" width="70%" height="70%" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
      )}

      <Handle
        type="source"
        position={sourcePosition}
        className="opacity-0 pointer-events-none"
      />
    </div>
  );
});

export default TaxonomyNode;
