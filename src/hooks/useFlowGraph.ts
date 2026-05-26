import { useMemo } from 'react';
import type { DagData, Orientation } from '../types';
import { getParents, hasMultipleParents } from '../utils/dagUtils';
import dagre from 'dagre';
import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';
import { TaxonomyNodeData } from '../components/tree/TaxonomyNode';
import { FALLBACK_COLOR } from '../types';

export function useFlowGraph(
  dagData: DagData | null,
  expanded: Set<string>,
  activeId: string,
  searchQuery: string,
  nodeSize: number,
  nodeShape: 'circle' | 'rect',
  orientation: Orientation,
  labelPosition: 'smart' | 'top' | 'bottom' | 'right' | 'left',
  hSpacing: number,
  vSpacing: number
) {
  return useMemo(() => {
    if (!dagData) return { nodes: [], edges: [] };

    // 1. Determine visible nodes based on expansion
    const visibleNodes = new Set<string>();
    const isVisible = (id: string, depth = 0) => {
      if (visibleNodes.has(id)) return;
      visibleNodes.add(id);
      if (expanded.has(id)) {
        const node = dagData.nodes[id];
        node?.children?.forEach(c => isVisible(c, depth + 1));
      }
    };
    isVisible(dagData.root);

    // 2. Prepare Dagre graph for layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Rankdir: 
    // TB (top-to-bottom) = vertical orientation
    // LR (left-to-right) = horizontal orientation
    const rankdir = orientation === 'vertical' ? 'TB' : 'LR';
    
    dagreGraph.setGraph({ 
      rankdir,
      nodesep: orientation === 'vertical' ? hSpacing : vSpacing,
      ranksep: orientation === 'vertical' ? vSpacing : hSpacing,
      align: 'DL'
    });

    const flowNodes: FlowNode<TaxonomyNodeData>[] = [];
    const flowEdges: FlowEdge[] = [];

    // Helper to find inherited color if missing
    const colorMemo = new Map<string, string>();
    const getInheritedColorLocal = (id: string): string => {
      if (colorMemo.has(id)) return colorMemo.get(id)!;
      const node = dagData.nodes[id];
      if (!node) return FALLBACK_COLOR;
      if (node.color) {
        colorMemo.set(id, node.color);
        return node.color;
      }
      const parents = getParents(dagData, id);
      if (parents.length > 0) {
        // Just take the first parent's color roughly for the visual
        const inherited = getInheritedColorLocal(parents[0]);
        colorMemo.set(id, inherited);
        return inherited; // note: not purely determinisitic in DAG but matches previous heuristic
      }
      return FALLBACK_COLOR;
    };

    // Helper to determine active graph
    const activePathAndSubtree = new Set<string>();
    if (activeId && visibleNodes.has(activeId)) {
      // Add all ancestors
      const dfsUp = (id: string) => {
        if (activePathAndSubtree.has(id)) return;
        activePathAndSubtree.add(id);
        const parents = getParents(dagData, id);
        for (const p of parents) dfsUp(p);
      };
      dfsUp(activeId);

      // Add all descendants via expanded paths
      const dfsDown = (id: string) => {
        if (!visibleNodes.has(id)) return; // Only highlight visible descendants
        activePathAndSubtree.add(id);
        if (expanded.has(id)) {
          dagData.nodes[id]?.children?.forEach(c => dfsDown(c));
        }
      };
      dfsDown(activeId);
    }

    const nodeWidth = nodeShape === 'circle' ? nodeSize * 2 : nodeSize * 2;
    const nodeHeight = nodeShape === 'circle' ? nodeSize * 2 : nodeSize * 1.1;

    // 3. Populate dagre nodes
    visibleNodes.forEach(id => {
      dagreGraph.setNode(id, { width: nodeWidth, height: nodeHeight });
    });

    // 4. Populate dagre edges (only between visible nodes)
    visibleNodes.forEach(id => {
      const node = dagData.nodes[id];
      if (node && expanded.has(id)) {
        node.children?.forEach(childId => {
          if (visibleNodes.has(childId)) {
            dagreGraph.setEdge(id, childId);
          }
        });
      }
    });

    // 5. Calculate Layout
    dagre.layout(dagreGraph);

    // 6. Build Flow Nodes and Edges
    visibleNodes.forEach(id => {
      const node = dagData.nodes[id];
      const dagreNode = dagreGraph.node(id);
      
      const isDimmed = activeId && !activePathAndSubtree.has(id) && id !== activeId;
      const isMultiParent = hasMultipleParents(dagData, id);
      const isExpanded = expanded.has(id);
      
      // Determine if it should act as a cluster placeholder
      // (Selma formerly showed a "+X" cluster node if not expanded and depth>=1. We can approximate this by creating a cluster marker, or simply letting the node stay unexpanded).
      // For now, React Flow naturally shows nothing beyond unexpanded edges.
      // Wait, Selma's PrunedHierarchy added a `ClusterNode` child. 
      // If we want a cluster marker, we can add a fake child node.
      const hasChildren = node.children && node.children.length > 0;
      const unexpandedWithChildren = hasChildren && !isExpanded && id !== dagData.root;
      
      flowNodes.push({
        id,
        type: 'taxonomyNode',
        position: {
          x: dagreNode.x - nodeWidth / 2,
          y: dagreNode.y - nodeHeight / 2
        },
        data: {
          id: node.id,
          name: node.name,
          color: getInheritedColorLocal(id),
          image: node.image,
          iconChar: node.iconChar,
          iconFont: node.iconFont,
          attachments: node.attachments,
          hasChildren: !!hasChildren,
          searchQuery,
          nodeSize,
          nodeShape,
          orientation,
          labelPosition,
          hasMultipleParents: isMultiParent
        },
        style: {
          opacity: isDimmed ? 0.3 : 1,
          transition: 'all 0.3s ease-in-out',
        }
      });

      // Add a cluster node placeholder if collapsed and has children
      if (unexpandedWithChildren) {
        const clusterId = `${id}__cluster`;
        const clusterCount = node.children!.length;
        
        // Dagre doesn't know about this node, we place it close to the parent manually
        const offsetDist = nodeShape === 'circle' ? nodeSize + 30 : nodeSize + 40;
        const cx = dagreNode.x + (orientation === 'horizontal' ? offsetDist : 0) - nodeWidth / 2;
        const cy = dagreNode.y + (orientation === 'vertical' ? offsetDist : 0) - nodeHeight / 2;
        
        flowNodes.push({
          id: clusterId,
          type: 'taxonomyNode',
          position: { x: cx, y: cy },
          data: {
            id: clusterId,
            name: '',
            color: getInheritedColorLocal(id),
            hasChildren: false,
            searchQuery,
            nodeSize: nodeSize * 0.65,
            nodeShape: 'circle',
            orientation,
            labelPosition,
            hasMultipleParents: false,
            isCluster: true,
            clusterCount
          },
          style: {
            opacity: isDimmed ? 0.2 : 0.6,
            transition: 'all 0.3s ease-in-out',
          }
        });

        // Add edge to cluster
        flowEdges.push({
          id: `e-${id}-${clusterId}`,
          source: id,
          target: clusterId,
          type: nodeShape === 'rect' ? 'smoothstep' : 'default',
          style: {
            stroke: getInheritedColorLocal(id),
            opacity: isDimmed ? 0.2 : 0.6,
            strokeWidth: 2,
            transition: 'all 0.3s ease-in-out'
          }
        });
      }
    });

    dagreGraph.edges().forEach(e => {
      const parentId = e.v;
      const childId = e.w;

      // Determine if edge should be "dashed" (secondary).
      // Since DagDaga has multiple parents, the first parent is usually considered primary.
      // But dagre layout may place it anywhere.
      
      const isDimmedStyle = activeId && (!activePathAndSubtree.has(parentId) || !activePathAndSubtree.has(childId));
      
      flowEdges.push({
        id: `e-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        type: nodeShape === 'rect' ? 'smoothstep' : 'default',
        style: {
          stroke: getInheritedColorLocal(parentId),
          opacity: isDimmedStyle ? 0.2 : 0.7,
          strokeWidth: 2,
          transition: 'all 0.3s ease-in-out',
          // If secondary parent, we might use dashed lines?
          // The issue says "we can do without dashed lines" but if we want we can:
          // strokeDasharray: isSecondary ? '5 5' : 'none'
        }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [dagData, expanded, activeId, searchQuery, nodeSize, nodeShape, orientation, labelPosition, hSpacing, vSpacing]);
}
