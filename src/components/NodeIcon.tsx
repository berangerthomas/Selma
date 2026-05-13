import { getInheritedColor } from '../utils/treeUtils';
import { getInheritedColorDag } from '../utils/dagUtils';
import { useI18n } from '../i18n';
import type { TreeNode, DagData } from '../types';
import { FALLBACK_COLOR } from '../types';

interface NodeIconProps {
  node: TreeNode;
  data: TreeNode | null;
  dagData?: DagData | null;
  className?: string;
}

export function NodeIcon({ node, data, dagData, className = '' }: NodeIconProps) {
  const { t } = useI18n();
  const bgColor = dagData ? getInheritedColorDag(dagData, node.id) : (data ? getInheritedColor(node.id, data) : FALLBACK_COLOR);
  
  const finalIconChar = t(`nodes.${node.id}.iconChar`, { defaultValue: node.iconChar || '' });
  const finalIconFont = t(`nodes.${node.id}.iconFont`, { defaultValue: node.iconFont || 'sans-serif' });
  
  return (
    <div
      className={`flex-shrink-0 w-5 h-5 flex justify-center items-center mr-2 rounded-sm ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {node.image ? (
        <img src={node.image} alt="" className="w-4 h-4 object-contain" />
      ) : finalIconChar ? (
        <span style={{ fontFamily: finalIconFont, fontSize: '12px', color: '#fff', lineHeight: 1 }} aria-hidden="true">
          {finalIconChar}
        </span>
      ) : null}
    </div>
  );
}
