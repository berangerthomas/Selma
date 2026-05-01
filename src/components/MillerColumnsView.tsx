import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTree } from '../context/TreeContext';
import { useI18n } from '../i18n';
import type { TreeNode } from '../types';
import Sidebar from './Sidebar';
import { HighlightMatch } from '../utils/highlight';
import { findNodeById, findNodePath } from '../utils/treeUtils';
import AttachmentIcon from './AttachmentIndicator';
import { ChevronRight } from './icons/ChevronRight';
import { NodeIcon } from './NodeIcon';
import { useSidebar } from '../hooks/useSidebar';

const MillerColumnsView = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { data, activeId, setActiveId, setExpandedToPath, searchQuery } = useTree();
  const { t } = useI18n();
  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevColsRef = useRef<TreeNode[][]>([]);
  const [trailingCols, setTrailingCols] = useState<TreeNode[][]>([]);
  const [animateExit, setAnimateExit] = useState(false);
  const prevActiveIdRef = useRef<string>(activeId);

  const activeNode = data ? findNodeById(data, activeId) : null;

  // Build columns based on expanded nodes path, preserving state when sidebar closes
  const columns = useMemo(() => {
    const cols: TreeNode[][] = [];
    if (!data) return cols;
    
    // First column is always the root node itself
    cols.push([data]);

    // Determine which node drives the column expansion.
    // When sidebar is closed (activeId cleared), use the last active node so columns stay put.
    const driverId = activeId || prevActiveIdRef.current;
    if (!driverId) return cols;

    // Find path to driverId starting from root
    const path = findNodePath(data, driverId) || [];

    // For each node in path, if it has children, add them as the next column.
    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      if (node.children && node.children.length > 0) {
        cols.push(node.children);
      }
    }

    return cols;
  }, [data, activeId]);

  // Keep track of the last active id so columns don't collapse when sidebar closes
  useEffect(() => {
    if (activeId) {
      prevActiveIdRef.current = activeId;
    }
  }, [activeId]);

  const activePathIds = useMemo(() => {
    const set = new Set<string>();
    if (!data || !activeId) return set;
    
    const path = findNodePath(data, activeId);
    if (path) {
      path.forEach(n => set.add(n.id));
    }
    return set;
  }, [data, activeId]);

  // Smooth scroll and trailing columns rendering for backwards navigation
  useLayoutEffect(() => {
    const prevCols = prevColsRef.current;
    
    // When shrinking, we restore the lost columns IMMEDIATELY before paint
    if (columns.length < prevCols.length) {
      if (trailingCols.length === 0) {
        // User navigated backwards! 
        const lostCols = prevCols.slice(columns.length);
        setAnimateExit(false);
        setTrailingCols(lostCols);
      }
    }
  }, [columns, prevColsRef]);

  // Trigger the CSS exit animation after the browser has painted the columns at full width
  useEffect(() => {
    if (trailingCols.length > 0 && !animateExit) {
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateExit(true);
        });
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [trailingCols, animateExit]);

  // Handle the scroll animations after DOM is updated and painted
  useEffect(() => {
    const prevCols = prevColsRef.current;

    if (columns.length < prevCols.length) {
      // Shrinking: scroll to the new last column immediately so the eye can follow
      if (containerRef.current) {
        const targetIndex = Math.max(0, columns.length - 1);
        const targetChild = containerRef.current.children[targetIndex] as HTMLElement | undefined;
        if (targetChild) {
          try {
            containerRef.current.scrollTo({ left: targetChild.offsetLeft, behavior: 'smooth' });
          } catch (e) {
            try {
              targetChild.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            } catch (e2) {
              // noop
            }
          }
        } else {
          containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
      }

      // Keep trailing cols visible during the CSS exit animation, then clear them
      const timer = setTimeout(() => {
        setTrailingCols([]);
        setAnimateExit(false);
        prevColsRef.current = columns;
      }, 320);

      return () => clearTimeout(timer);

    } else {
      // Forward navigation (or same length)
      setTrailingCols([]);
      setAnimateExit(false);
      prevColsRef.current = columns;

      if (containerRef.current) {
        // Use a tiny timeout to let the DOM append the new column before calculating scrollWidth
        const timer = setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              left: containerRef.current.scrollWidth,
              behavior: 'smooth'
            });
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [columns, activeId, sidebarOpen]);

  const columnsToRender = useMemo(() => {
    return [...columns, ...trailingCols];
  }, [columns, trailingCols]);

  return (
    <div 
      ref={ref}
      className="flex h-[100vh] w-full overflow-hidden bg-gray-50 dark:bg-[#121212]" 
      onClick={() => {
        setSidebarOpen(false);
      }}
    >
      <div 
        ref={containerRef}
        className="flex-1 flex overflow-x-auto pt-20 pb-32" 
        style={{ paddingLeft: '280px' }} // clear toolbar
      >
        {columnsToRender.map((col, colIndex) => {
          const isTrailing = colIndex >= columns.length;
          return (
          <div 
            key={colIndex} 
            className={[
              'miller-col flex-shrink-0 min-w-[200px] w-fit max-w-[400px] h-full overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e]',
              isTrailing && animateExit ? 'miller-col-exit' : ''
            ].join(' ')}
          >
            {col.map((node) => {
              const isSelected = activePathIds.has(node.id);
              const isActive = activeId === node.id;
              const hasChildren = !!node.children && node.children.length > 0;
              const displayName = t(`nodes.${node.id}.name`, { defaultValue: node.name || '' });

              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-between py-2 px-3 gap-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800/50 ${isActive ? 'bg-blue-100 dark:bg-blue-900/40' : isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveId(node.id);
                    // Keep the global tree expansion state in sync so other views follow
                    if (data) {
                      const path = findNodePath(data, node.id)?.map(n => n.id);
                      if (path) {
                        setExpandedToPath(path);
                      }
                    }
                  }}
                >
                  <div className="flex items-center overflow-hidden min-w-0">
                    <NodeIcon node={node} data={data} />
                    <div className={`text-sm select-none whitespace-nowrap overflow-hidden text-ellipsis ${isSelected || isActive ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                      <HighlightMatch text={displayName} query={searchQuery} />
                      {node.attachments && node.attachments.length > 0 && (
                        <AttachmentIcon size={12} className="ml-1 inline-block opacity-70 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  {hasChildren ? (
                    <ChevronRight className="flex-shrink-0 text-gray-400" />
                  ) : (
                    <div className="w-4 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </div>

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

export default MillerColumnsView;
