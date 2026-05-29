import { useState, useEffect } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';
import type { DagData, Orientation } from '../types';
import { getParents, hasMultipleParents, getInheritedColorDag, buildParentMap } from '../utils/dagUtils';
import { getNodeDimensions } from '../utils/nodeLayout';
import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';
import type { TaxonomyNodeData } from '../components/tree/TaxonomyNode';

const elk = new ELK();
const BASE_LAYOUT_SPACING = 30;
const DEFAULT_H_SPACING = 220;
const DEFAULT_V_SPACING = 80;
const SPACING_RESPONSE = 0.65;

function computeOpacity(isDimmed: boolean, isCluster = false): number {
  if (!isDimmed) return isCluster ? 0.6 : 1;
  return isCluster ? 0.2 : 0.3;
}

function estimateLabelWidth(text: string, fontSize = 14): number {
  return Math.ceil(text.length * fontSize * 0.6) + 20;
}

function softenSpacing(value: number, defaultValue: number): number {
  const normalizedDelta = (value - defaultValue) / defaultValue;
  return 1 + normalizedDelta * SPACING_RESPONSE;
}

function buildVisibleNodes(dagData: DagData, expanded: Set<string>): Set<string> {
  const visible = new Set<string>();
  const walk = (id: string) => {
    if (visible.has(id)) return;
    visible.add(id);
    if (expanded.has(id)) {
      const node = dagData.nodes[id];
      node?.children?.forEach(c => walk(c));
    }
  };
  walk(dagData.root);
  return visible;
}

function buildElkGraph(
  dagData: DagData,
  visibleNodes: Set<string>,
  nodeWidth: number,
  nodeHeight: number,
  expanded: Set<string>
): { elkNodes: ElkNode[]; elkEdges: ElkExtendedEdge[] } {
  const elkNodes: ElkNode[] = [];
  const elkEdges: ElkExtendedEdge[] = [];
  visibleNodes.forEach(id => {
    const node = dagData.nodes[id];
    if (!node) return;
    const labelWidth = estimateLabelWidth(node.name);
    const labelHeight = 20;
    const layoutWidth = Math.max(nodeWidth, labelWidth);
    const layoutHeight = nodeHeight + labelHeight;
    elkNodes.push({
      id,
      width: layoutWidth,
      height: layoutHeight,
      labels: [{ text: node.name, width: labelWidth, height: labelHeight }],
    });
  });

  visibleNodes.forEach(id => {
    const node = dagData.nodes[id];
    if (node && expanded.has(id)) {
      node.children?.forEach(childId => {
        if (visibleNodes.has(childId)) {
          elkEdges.push({ id: `e-${id}-${childId}`, sources: [id], targets: [childId] });
        }
      });
    }
  });

  return { elkNodes, elkEdges };
}

function buildActivePathAndSubtree(
  dagData: DagData,
  visibleNodes: Set<string>,
  expanded: Set<string>,
  activeId: string
): Set<string> {
  const activePathAndSubtree = new Set<string>();
  if (!activeId || !visibleNodes.has(activeId)) return activePathAndSubtree;

  const dfsUp = (id: string) => {
    if (activePathAndSubtree.has(id)) return;
    activePathAndSubtree.add(id);
    const parents = getParents(dagData, id);
    for (const p of parents) dfsUp(p);
  };

  const dfsDown = (id: string) => {
    if (!visibleNodes.has(id)) return;
    activePathAndSubtree.add(id);
    if (expanded.has(id)) {
      dagData.nodes[id]?.children?.forEach(c => dfsDown(c));
    }
  };

  dfsUp(activeId);
  dfsDown(activeId);
  return activePathAndSubtree;
}

function buildFlowElements(params: {
  dagData: DagData;
  visibleNodes: Set<string>;
  expanded: Set<string>;
  activeId: string;
  searchQuery: string;
  nodeSize: number;
  nodeShape: 'circle' | 'rect';
  orientation: Orientation;
  labelPosition: 'smart' | 'top' | 'bottom' | 'right' | 'left';
  nodeWidth: number;
  nodeHeight: number;
  hSpacing: number;
  vSpacing: number;
  horizontalScale: number;
  verticalScale: number;
  elkEdges: ElkExtendedEdge[];
  elkNodePos: Map<string, { x: number; y: number }>;
  getColor: (id: string) => string;
}) {
  const {
    dagData,
    visibleNodes,
    expanded,
    activeId,
    searchQuery,
    nodeSize,
    nodeShape,
    orientation,
    labelPosition,
    nodeWidth,
    nodeHeight,
    hSpacing,
    vSpacing,
    horizontalScale,
    verticalScale,
    elkEdges,
    elkNodePos,
    getColor,
  } = params;

  const activePathAndSubtree = buildActivePathAndSubtree(dagData, visibleNodes, expanded, activeId);
  const flowNodes: FlowNode<TaxonomyNodeData>[] = [];
  const flowEdges: FlowEdge[] = [];

  visibleNodes.forEach(id => {
    const node = dagData.nodes[id];
    const pos = elkNodePos.get(id);
    if (!pos || !node) return;

    const isDimmed = !!activeId && !activePathAndSubtree.has(id) && id !== activeId;
    const isMultiParent = hasMultipleParents(dagData, id);
    const isExpanded = expanded.has(id);
    const hasChildren = node.children && node.children.length > 0;
    const unexpandedWithChildren = hasChildren && !isExpanded && id !== dagData.root;

    flowNodes.push({
      id,
      type: 'taxonomyNode',
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
      data: {
        id: node.id,
        name: node.name,
        color: getColor(id),
        image: node.image,
        iconChar: node.iconChar,
        iconFont: node.iconFont,
        attachments: node.attachments,
        hasChildren: !!hasChildren,
        isExpanded,
        searchQuery,
        nodeSize,
        nodeShape,
        orientation,
        labelPosition,
        hasMultipleParents: isMultiParent,
      },
      style: {
        opacity: computeOpacity(isDimmed, false),
        transition: 'all 0.3s ease-in-out',
      },
    });

    if (unexpandedWithChildren) {
      const clusterId = `${id}__cluster`;
      const clusterCount = node.children!.length;
      const clusterSpacing = orientation === 'horizontal' ? hSpacing * horizontalScale : vSpacing * verticalScale;
      const offsetDist = nodeShape === 'circle'
        ? Math.max(nodeSize + 10, clusterSpacing * 0.4)
        : Math.max(nodeSize + 20, clusterSpacing * 0.4);
      const cx = pos.x + (orientation === 'horizontal' ? offsetDist : 0) - nodeWidth / 2;
      const cy = pos.y + (orientation === 'vertical' ? offsetDist : 0) - nodeHeight / 2;

      flowNodes.push({
        id: clusterId,
        type: 'taxonomyNode',
        position: { x: cx, y: cy },
        data: {
          id: clusterId,
          name: '',
          color: getColor(id),
          hasChildren: false,
          searchQuery,
          nodeSize: nodeSize * 0.65,
          nodeShape: 'circle',
          orientation,
          labelPosition,
          hasMultipleParents: false,
          isCluster: true,
          clusterCount,
        },
        style: {
          opacity: computeOpacity(isDimmed, true),
          transition: 'all 0.3s ease-in-out',
        },
      });

      flowEdges.push({
        id: `e-${id}-${clusterId}`,
        source: id,
        target: clusterId,
        type: nodeShape === 'rect' ? 'smoothstep' : 'default',
        style: {
          stroke: getColor(id),
          opacity: computeOpacity(isDimmed, true),
          strokeWidth: 2,
          transition: 'all 0.3s ease-in-out',
        },
      });
    }
  });

  for (const elkEdge of elkEdges) {
    const parentId = elkEdge.sources[0];
    const childId = elkEdge.targets[0];
    const isDimmedEdge = !!activeId && (!activePathAndSubtree.has(parentId) || !activePathAndSubtree.has(childId));

    flowEdges.push({
      id: elkEdge.id,
      source: parentId,
      target: childId,
      type: nodeShape === 'rect' ? 'smoothstep' : 'default',
      style: {
        stroke: getColor(parentId),
        opacity: computeOpacity(isDimmedEdge, false),
        strokeWidth: 2,
        transition: 'all 0.3s ease-in-out',
      },
    });
  }

  return { nodes: flowNodes, edges: flowEdges };
}

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
  const [result, setResult] = useState<{ nodes: FlowNode<TaxonomyNodeData>[]; edges: FlowEdge[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    if (!dagData) {
      setResult({ nodes: [], edges: [] });
      return;
    }

    let cancelled = false;

    // 1. Determine visible nodes based on expansion
    const visibleNodes = buildVisibleNodes(dagData, expanded);

    // 2. Build parent map once for O(1) lookups in color resolution
    const parentMap = buildParentMap(dagData);
    const { width: nodeWidth, height: nodeHeight } = getNodeDimensions(nodeSize, nodeShape);

    // 3. Build ELK graph elements with label-aware dimensions
    const elkNodes: ElkNode[] = [];
    const elkEdges: ElkExtendedEdge[] = [];

    // Cache inherited colors per node id for repeated lookups
    const colorCache = new Map<string, string>();
    const getColor = (id: string) => {
      if (!colorCache.has(id)) colorCache.set(id, getInheritedColorDag(dagData, id, parentMap));
      return colorCache.get(id)!;
    };

    const direction = orientation === 'vertical' ? 'DOWN' : 'RIGHT';

    // Apply the user sliders directly to the rendered X/Y axes.
    const horizontalScale = softenSpacing(hSpacing, DEFAULT_H_SPACING);
    const verticalScale = softenSpacing(vSpacing, DEFAULT_V_SPACING);

    const built = buildElkGraph(dagData, visibleNodes, nodeWidth, nodeHeight, expanded);
    elkNodes.push(...built.elkNodes);
    elkEdges.push(...built.elkEdges);

    const graph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'mrtree',
        'elk.direction': direction,
        'elk.spacing.nodeNode': String(BASE_LAYOUT_SPACING),
        'elk.nodeLabels.placement': 'OUTSIDE H_CENTER V_TOP',
        'elk.nodeSize.constraints': 'NODE_LABELS MINIMUM_SIZE',
      },
      children: elkNodes,
      edges: elkEdges,
    };

    elk.layout(graph).then(layouted => {
      if (cancelled) return;

      // Build position map from ELK result
      const elkNodePos = new Map<string, { x: number; y: number }>();
      for (const child of layouted.children ?? []) {
        elkNodePos.set(child.id, {
          x: (child.x ?? 0) * horizontalScale,
          y: (child.y ?? 0) * verticalScale,
        });
      }

      const flow = buildFlowElements({
        dagData,
        visibleNodes,
        expanded,
        activeId,
        searchQuery,
        nodeSize,
        nodeShape,
        orientation,
        labelPosition,
        nodeWidth,
        nodeHeight,
        hSpacing,
        vSpacing,
        horizontalScale,
        verticalScale,
        elkEdges,
        elkNodePos,
        getColor,
      });

      setResult(flow);
    });

    return () => {
      cancelled = true;
    };
  }, [dagData, expanded, activeId, searchQuery, nodeSize, nodeShape, orientation, labelPosition, hSpacing, vSpacing]);

  return result;
}