import { useTree } from '../context/TreeContext';
import { useI18n } from '../i18n';
import type { TreeNode } from '../types';
import Sidebar from './Sidebar';
import { HighlightMatch } from '../utils/highlight';
import { findNodeById } from '../utils/treeUtils';
import AttachmentIcon from './AttachmentIndicator';
import { ChevronRight } from './icons/ChevronRight';
import { NodeIcon } from './NodeIcon';
import { useSidebar } from '../hooks/useSidebar';

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

        <NodeIcon node={node} data={data} />

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

const FileTreeView = ({ ref }: { ref?: React.RefObject<HTMLDivElement | null> }) => {
  const { data, activeId } = useTree();
  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId);
  
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
};

export default FileTreeView;
