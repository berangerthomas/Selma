import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTree } from '../context/TreeContext';
import { useI18n } from '../i18n';
import type { DagNode } from '../types';
import Sidebar from './Sidebar';
import { HighlightMatch } from '../utils/highlight';
import { findNodeById, findNodePath } from '../utils/treeUtils';
import { findDagPath, hasMultipleParents, getParents, buildParentMap } from '../utils/dagUtils';
import AttachmentIcon from './AttachmentIndicator';
import { ChevronRight } from './icons/ChevronRight';
import { NodeIcon } from './NodeIcon';
import { useSidebar } from '../hooks/useSidebar';

const MillerColumnsView = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { data, dagData, activeId, setActiveId, setExpandedToPath, searchQuery } = useTree();
  const { t } = useI18n();
  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevColsRef = useRef<DagNode[][]>([]);
  const [trailingCols, setTrailingCols] = useState<DagNode[][]>([]);
  const [animateExit, setAnimateExit] = useState(false);
  const prevActiveIdRef = useRef<string>(activeId);

  // DAG-aware context: which parent chain drives the column building.
  // When the user navigates through a multi-parent node, the column tree
  // is built via the parent they came from, not the BFS primary path.
  const [columnContextParent, setColumnContextParent] = useState<string | null>(null);

  // Reset the context when leaving a multi-parent node
  useEffect(() => {
    if (!activeId || !dagData || !hasMultipleParents(dagData, activeId)) {
      setColumnContextParent(null);
    }
  }, [activeId, dagData]);

  const activeNode = data ? findNodeById(data, activeId) : null;

  // Memoized parent map for O(1) lookups
  const parentMap = useMemo(() => dagData ? buildParentMap(dagData) : new Map<string, string[]>(), [dagData]);

  // Build columns based on the DAG path from root to the driver node.
  // The path follows `columnContextParent` when set on a multi-parent target.
  const columns = useMemo<DagNode[][]>(() => {
    if (!dagData) return [];
    const rootNode = dagData.nodes[dagData.root];
    if (!rootNode) return [];

    const driverId = activeId || prevActiveIdRef.current;
    if (!driverId) return [[rootNode]];

    const path = findDagPath(dagData, dagData.root, driverId, columnContextParent);
    if (!path.length) return [[rootNode]];

    const cols: DagNode[][] = [];
    for (const node of path) {
      const children = (node.children ?? [])
        .map(id => dagData.nodes[id])
        .filter((n): n is DagNode => !!n);
      if (children.length > 0) cols.push(children);
    }
    return cols;
  }, [dagData, activeId, columnContextParent]); // Note: expanded NOT a dependency

  // Keep track of the last active id so columns don't collapse when sidebar closes
  useEffect(() => {
    if (activeId) {
      prevActiveIdRef.current = activeId;
    }
  }, [activeId]);

  // Path from root to the active node, mirroring the column-driving path.
  const activePathIds = useMemo(() => {
    const set = new Set<string>();
    if (!dagData || !activeId) return set;
    const path = findDagPath(dagData, dagData.root, activeId, columnContextParent);
    path.forEach(n => set.add(n.id));
    return set;
  }, [dagData, activeId, columnContextParent]);

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
        // Use requestAnimationFrame to sync scrolling after the DOM append is painted
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              left: containerRef.current.scrollWidth,
              behavior: 'smooth'
            });
          }
        });
      }
    }
  }, [columns, activeId, sidebarOpen]);

  const columnsToRender = useMemo(() => {
    return [...columns, ...trailingCols];
  }, [columns, trailingCols]);

  // When the user clicks a node, record the driving parent for the next
  // column build. The driving parent is the first node in the previous column
  // (i.e. the column the user came from). Only recorded when the target
  // itself is multi-parent — otherwise the context resets to null.
  const handleNodeClick = (node: DagNode, columnIndex: number) => {
    if (dagData) {
      const drivingParent = columns[columnIndex - 1]?.[0]?.id ?? null;
      if (hasMultipleParents(dagData, node.id, parentMap) && drivingParent) {
        setColumnContextParent(drivingParent);
      } else {
        setColumnContextParent(null);
      }
    }
    setActiveId(node.id);
    // Keep the global tree expansion state in sync so other views follow
    if (data) {
      const path = findNodePath(data, node.id)?.map(n => n.id);
      if (path) {
        setExpandedToPath(path);
      }
    }
  };

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
              {/* Context switcher — only on the last "live" column when the
                  active node is multi-parent. Renders above the column body
                  so it doesn't shift the existing items. */}
              {!isTrailing && colIndex === columns.length - 1 && dagData && activeId && hasMultipleParents(dagData, activeId, parentMap) && (
                <div className="px-2 py-1.5 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 mr-1 font-semibold">
                    {t('view_in_context', { defaultValue: 'View in:' })}
                  </span>
                  {getParents(dagData, activeId, parentMap).map(pid => {
                    const isSelected = columnContextParent
                      ? columnContextParent === pid
                      : pid === getParents(dagData, activeId, parentMap)[0];
                    return (
                      <button
                        key={pid}
                        onClick={(e) => {
                          e.stopPropagation();
                          setColumnContextParent(pid);
                        }}
                        className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        }`}
                        title={dagData.nodes[pid]?.name ?? pid}
                      >
                        {dagData.nodes[pid]?.name ?? pid}
                      </button>
                    );
                  })}
                </div>
              )}
              {col.map((node) => {
                const isSelected = activePathIds.has(node.id);
                const isActive = activeId === node.id;
                const hasChildren = !!node.children && node.children.length > 0;
                const displayName = t(`nodes.${node.id}.name`, { defaultValue: node.name || '' });
                // multi-parent nodes are not visible in columns (children are ID-based
                // here), but we still highlight the active node's row.
                return (
                  <div
                    key={node.id}
                    className={`flex items-center justify-between py-2 px-3 gap-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800/50 ${isActive ? 'bg-blue-100 dark:bg-blue-900/40' : isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeClick(node, colIndex);
                    }}
                  >
                    <div className="flex items-center overflow-hidden min-w-0">
                      <NodeIcon node={node} data={data} dagData={dagData} />
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
