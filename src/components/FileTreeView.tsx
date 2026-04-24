import React, { useState, useEffect } from 'react';
import { useTree } from '../context/TreeContext';
import { useI18n } from '../i18n';
import type { TreeNode } from '../types';
import Sidebar from './Sidebar';
import { HighlightMatch } from '../utils/highlight';
import { findNodeById, getInheritedColor } from '../utils/treeUtils';
import AttachmentIcon from './AttachmentIndicator';

const ChevronRight = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const FileNode = ({ node, depth }: { node: TreeNode; depth: number }) => {
  const { data, expanded, activeId, setActiveId, toggleNode, requestForceCenter, isFullyExpanded, searchQuery } = useTree();
  const { t } = useI18n();

  const isExpanded = expanded.has(node.id);
  const isActive = activeId === node.id;
  const hasChildren = !!node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      const willOpen = !isExpanded;
      toggleNode(node.id);
      setTimeout(() => {
        setActiveId(node.id);
        if (willOpen || isFullyExpanded) requestForceCenter();
      }, 80);
    } else {
      setActiveId(node.id);
    }
  };

  const finalIconChar = t(`nodes.${node.id}.iconChar`, { defaultValue: node.iconChar || '' });
  const finalIconFont = t(`nodes.${node.id}.iconFont`, { defaultValue: node.iconFont || 'sans-serif' });
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

        {/* Icon space */}
        <div className="flex-shrink-0 w-5 h-5 flex justify-center items-center mr-2 rounded-sm" style={{ backgroundColor: data ? getInheritedColor(node.id, data) : '#6b7280' }}>
          {node.image ? (
            <img src={node.image} alt="" className="w-4 h-4 object-contain" />
          ) : finalIconChar ? (
            <span style={{ fontFamily: finalIconFont, fontSize: '12px', color: '#fff', lineHeight: 1 }} aria-hidden="true">
              {finalIconChar}
            </span>
          ) : null}
        </div>

        {/* Node Name */}
        <div className={`text-sm select-none whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
          <HighlightMatch text={displayName} query={searchQuery} />
          {node.attachments && node.attachments.length > 0 && (
            <AttachmentIcon size={12} className="ml-1 inline-block opacity-70 text-gray-600 dark:text-gray-300 flex-shrink-0" />
          )}
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children!.map((child) => (
            <FileNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTreeView = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { data, activeId, setActiveId } = useTree();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  
  // Cast since findNodeById returns TreeNode | null and Sidebar might want it
  const activeNode = data ? findNodeById(data, activeId) : null;

  // Automatically open sidebar when active node changes
  useEffect(() => {
    if (activeId && activeId !== '') {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [activeId]);

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
          {data && <FileNode node={data} depth={0} />}
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
});

export default FileTreeView;
