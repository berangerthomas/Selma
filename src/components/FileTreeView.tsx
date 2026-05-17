import React, { useMemo } from 'react';
import { useTree } from '../context/TreeContext';
import { useI18n } from '../i18n';
import type { TreeNode } from '../types';
import Sidebar from './Sidebar';
import { HighlightMatch } from '../utils/highlight';
import { findNodeById } from '../utils/treeUtils';
import { buildParentMap, getParents } from '../utils/dagUtils';
import AttachmentIcon from './AttachmentIndicator';
import { ChevronRight } from './icons/ChevronRight';
import { NodeIcon } from './NodeIcon';
import { useSidebar } from '../hooks/useSidebar';

const FileNode = React.memo(({ node, depth, parentMap }: { node: TreeNode; depth: number; parentMap: Map<string, string[]> }) => {
  const { data, dagData, expanded, activeId, setActiveId, toggleNode, requestForceCenter, isFullyExpanded, searchQuery } = useTree();
  const { t } = useI18n();

  const isExpanded = expanded.has(node.id);
  const isActive = activeId === node.id;
  const hasChildren = !!node.children && node.children.length > 0;
  const parents = dagData ? getParents(dagData, node.id, parentMap) : [];
  const isMultiParent = parents.length > 1;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      const willOpen = !isExpanded;
      toggleNode(node.id);
      // React 18 batches setState in event handlers — no need for setTimeout
      setActiveId(node.id);
      if (willOpen || isFullyExpanded) requestForceCenter();
    } else {
      setActiveId(node.id);
    }
  };

  const displayName = t(`nodes.${node.id}.name`, { defaultValue: node.name || '' });

  return (
    <div>
      <div
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors ${isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleToggle}
      >
        {/* Chevron space: 24px wide */}
        <div className="flex-shrink-0 w-6 flex justify-center items-center mr-1 text-gray-400 dark:text-gray-500">
          {hasChildren && (
            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight />
            </div>
          )}
        </div>

        <NodeIcon node={node} data={data} dagData={dagData} />

        {/* Node Name */}
        <div className={`text-sm select-none whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
          <HighlightMatch text={displayName} query={searchQuery} />
          {node.attachments && node.attachments.length > 0 && (
            <AttachmentIcon size={12} className="ml-1 inline-block opacity-70 text-gray-600 dark:text-gray-300 flex-shrink-0" />
          )}
        </div>

        {/* Multi-parent badge */}
        {dagData && isMultiParent && (
          <button
            onClick={(e) => { e.stopPropagation(); }}
            title={`Also in: ${parents.map(pid => dagData.nodes[pid]?.name ?? pid).join(', ')}`}
            className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40
                       text-amber-700 dark:text-amber-300 flex-shrink-0 cursor-pointer hover:bg-amber-200
                       dark:hover:bg-amber-800/60 transition-colors"
            aria-label={`${parents.length} parent groups — click to see`}
          >
            ×{parents.length}
          </button>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children!.map((child) => (
            <FileNode key={child.id} node={child} depth={depth + 1} parentMap={parentMap} />
          ))}
        </div>
      )}
    </div>
  );
});

export default function FileTreeView({ ref }: { ref?: React.RefObject<HTMLDivElement | null> }) {
  const { data, dagData, activeId } = useTree();
  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId);

  const parentMap = useMemo(() => {
    if (!dagData) return new Map<string, string[]>();
    return buildParentMap(dagData);
  }, [dagData]);
  
  // Cast since findNodeById returns TreeNode | null and Sidebar might want it
  const activeNode = data ? findNodeById(data, activeId) : null;

  return (
    <div 
      ref={ref}
      className="flex h-[95vh] w-full overflow-hidden bg-white dark:bg-[#1e1e1e]" 
      onClick={() => {
        setSidebarOpen(false);
      }}
    >
      <div 
        className="flex-1 overflow-auto pt-4 pb-32" 
        style={{ paddingLeft: '260px' }}
      >
        <div className="max-w-5xl px-6">
          {data && <FileNode node={data} depth={0} parentMap={parentMap} />}
        </div>
      </div>

      {/* Spacer dynamique : réduit la largeur de l'arbre quand la Sidebar est ouverte pour empêcher la Sidebar de cacher l'ascenseur */}
      {sidebarOpen && <div style={{ width: sidebarWidth, flexShrink: 0 }} />}
      
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => {
          setSidebarOpen(false);
        }} 
        node={activeNode} 
        initialWidth={sidebarWidth} 
        onWidthChange={(w) => setSidebarWidth(w)} 
      />
    </div>
  );
}