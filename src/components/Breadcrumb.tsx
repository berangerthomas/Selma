import React from 'react'
import { useI18n } from '../i18n'
import type { TreeNode } from '../types'
import { findNodePath, findNodeById } from '../utils/treeUtils'

type Props = {
  root: TreeNode
  activeId: string
  onCrumbClick: (pathIds: string[]) => void
}

export default function Breadcrumb({ root, activeId, onCrumbClick }: Props) {
  const path = findNodePath(root, activeId) || [root]
  const { t } = useI18n()

  const legendNode = findNodeById(root, 'legend')
  const getLegendName = (item: TreeNode) => t(`nodes.${item.id}.name`, { defaultValue: item.name })
  const getLegendDescription = (item: TreeNode) =>
    t(`nodes.${item.id}.description`, {
      defaultValue: item.description ?? getLegendName(item)
    })

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

      {legendNode && legendNode.children && legendNode.children.length > 0 ? (
        <div className="legend" aria-hidden={false}>
          {legendNode.children.map((item) => (
            <div
              key={item.id}
              className="legend-item"
              title={getLegendDescription(item)}
              data-legend-id={item.id}
            >
              <div className="legend-badge" data-legend-id={item.id} aria-hidden>
                {getLegendName(item)}
              </div>
              <div className="legend-caption">{getLegendDescription(item)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
