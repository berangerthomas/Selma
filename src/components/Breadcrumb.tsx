import { useI18n } from '../i18n'
import type { TreeNode } from '../types'
import { findNodePath } from '../utils/treeUtils'

type Props = {
  root: TreeNode
  activeId: string
  onCrumbClick: (pathIds: string[]) => void
}

export default function Breadcrumb({ root, activeId, onCrumbClick }: Props) {
  const path = findNodePath(root, activeId) || [root]
  const { t } = useI18n()

  

  return (
    <div className="breadcrumb">
      <div className="crumbs">
        {path.map((n, i) => (
          <button
            key={n.id}
            className="crumb"
            onClick={() => onCrumbClick(path.slice(0, i + 1).map(p => p.id))}
          >
            {t(`nodes.${n.id}.name`, { defaultValue: n.name })}
          </button>
        ))}
      </div>

      
    </div>
  )
}
