import { Handle, Position } from '@xyflow/react';
import { useI18n } from '../../i18n';
import { HighlightMatch } from '../../utils/highlight';
import type { Attachment, Orientation } from '../../types';

export type TaxonomyNodeData = {
  id: string;
  name: string;
  color: string;
  image?: string;
  iconChar?: string;
  iconFont?: string;
  attachments?: Attachment[];
  hasChildren: boolean;
  searchQuery: string;
  nodeSize: number;
  nodeShape: 'circle' | 'rect';
  orientation: Orientation;
  labelPosition: 'smart' | 'top' | 'bottom' | 'right' | 'left';
  hasMultipleParents?: boolean;
  isCluster?: boolean;
  clusterCount?: number;
};

type Props = {
  data: TaxonomyNodeData;
};

export default function TaxonomyNode({ data }: Props) {
  const { t } = useI18n();
  const { nodeSize, nodeShape, orientation, labelPosition, color, isCluster, clusterCount } = data;

  const finalIconChar = t(`nodes.${data.id}.iconChar`, { defaultValue: data.iconChar || '' });
  const finalIconFont = t(`nodes.${data.id}.iconFont`, { defaultValue: data.iconFont || 'sans-serif' });
  const nodeName = isCluster ? '' : t(`nodes.${data.id}.name`, { defaultValue: data.name || '' });

  const radius = nodeSize; // scale equivalent
  const width = nodeShape === 'circle' ? radius * 2 : radius * 2.0;
  const height = nodeShape === 'circle' ? radius * 2 : radius * 1.1;

  const shapeClass = nodeShape === 'circle' ? 'rounded-full' : 'rounded-md';

  const sourcePosition = orientation === 'vertical' ? Position.Bottom : Position.Right;
  const targetPosition = orientation === 'vertical' ? Position.Top : Position.Left;

  let labelStyle: React.CSSProperties = { position: 'absolute', whiteSpace: 'nowrap', fontSize: 14, textShadow: '0 0 4px var(--panel-bg), 0 0 6px var(--panel-bg)', color: 'var(--text-main)', fontWeight: 500, pointerEvents: 'none' };
  
  if (labelPosition === 'top' || (labelPosition === 'smart' && orientation === 'horizontal')) {
    labelStyle = { ...labelStyle, bottom: '100%', marginBottom: 8, left: '50%', transform: 'translateX(-50%)' };
  } else if (labelPosition === 'bottom' || (labelPosition === 'smart' && orientation === 'vertical')) {
    labelStyle = { ...labelStyle, top: '100%', marginTop: 8, left: '50%', transform: 'translateX(-50%)' };
  } else if (labelPosition === 'right') {
    labelStyle = { ...labelStyle, left: '100%', marginLeft: 10, top: '50%', transform: 'translateY(-50%)' };
  } else if (labelPosition === 'left') {
    labelStyle = { ...labelStyle, right: '100%', marginRight: 10, top: '50%', transform: 'translateY(-50%)' };
  } else {
    // fallback smart just in case
    labelStyle = { ...labelStyle, bottom: '100%', marginBottom: 8, left: '50%', transform: 'translateX(-50%)' };
  }

  return (
    <div
      className={`relative flex items-center justify-center border-2 border-white shadow-sm ${shapeClass} ${isCluster ? 'cursor-pointer' : 'cursor-pointer'}`}
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
        <div style={labelStyle}>
          <HighlightMatch text={nodeName} query={data.searchQuery} />
        </div>
      )}

      {/* Cluster text (if cluster) */}
      {isCluster && (
        <div
          style={{
            position: 'absolute',
            ...(nodeShape === 'rect' ? { left: '100%', marginLeft: 8 } : { left: '100%', marginLeft: 6 }),
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 13,
            textShadow: '0 0 4px var(--panel-bg), 0 0 6px var(--panel-bg)',
            color: 'var(--text-main)',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
        >
          <HighlightMatch text={t('', { defaultValue: data.name || '' })} query={data.searchQuery} />
        </div>
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
}
