import type { Edge as FlowEdge, Node as FlowNode } from '@xyflow/react';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';
import type { DagData, LabelPosition, NodeShape, Orientation, TaxonomyNodeData } from '../types';
import { buildParentMap, getInheritedColorDag, getParents, hasMultipleParents } from './dagUtils';
import { getNodeDimensions, type NodeDimensions } from './nodeLayout';

const LABEL_FONT_SIZE = 14;
const LABEL_HEIGHT = 20;
const LABEL_PADDING = 20;
const LABEL_WIDTH_FACTOR = 0.6;
const NODE_TRANSITION = 'all 0.3s ease-in-out';
const CLUSTER_SIZE_RATIO = 0.65;
const CLUSTER_SPACING_RATIO = 0.4;

type ParentMap = Map<string, string[]>;
type ColorResolver = (id: string) => string;

export type FlowGraphElements = {
  nodes: FlowNode<TaxonomyNodeData>[];
  edges: FlowEdge[];
};

export type LayoutNodeFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ElkSpacing = {
  layer: number;
  node: number;
};

export type ElkGraphLayout = {
  graph: ElkNode;
  edges: ElkExtendedEdge[];
  nodeDimensions: NodeDimensions;
  spacing: ElkSpacing;
};

function buildNodeOrder(dagData: DagData): Map<string, number> {
  return new Map(Object.keys(dagData.nodes).map((id, index) => [id, index]));
}

function compareNodeOrder(order: Map<string, number>) {
  return (left: string, right: string) => {
    const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right);
  };
}

function sortNodeIds(ids: Iterable<string>, order: Map<string, number>): string[] {
  return Array.from(ids).sort(compareNodeOrder(order));
}

function computeOpacity(isDimmed: boolean, isCluster = false): number {
  if (!isDimmed) return isCluster ? 0.6 : 1;
  return isCluster ? 0.2 : 0.3;
}

function estimateLabelWidth(text: string, fontSize = LABEL_FONT_SIZE): number {
  return Math.ceil(text.length * fontSize * LABEL_WIDTH_FACTOR) + LABEL_PADDING;
}

function edgeTypeFor(nodeShape: NodeShape): FlowEdge['type'] {
  return nodeShape === 'rect' ? 'smoothstep' : 'default';
}

function transitionStyle(opacity: number) {
  return { opacity, transition: NODE_TRANSITION };
}

function getClusterOffset(nodeSize: number, nodeShape: NodeShape, spacing: ElkSpacing): number {
  const minimumOffset = nodeShape === 'circle' ? nodeSize + 10 : nodeSize + 20;
  return Math.max(minimumOffset, spacing.layer * CLUSTER_SPACING_RATIO);
}

function visualPosition(frame: LayoutNodeFrame, dimensions: NodeDimensions, orientation: Orientation) {
  const layoutWidth = frame.width || dimensions.width;
  const layoutHeight = frame.height || dimensions.height;

  if (orientation === 'horizontal') {
    return {
      x: frame.x,
      y: frame.y + (layoutHeight - dimensions.height) / 2,
    };
  }

  return {
    x: frame.x + (layoutWidth - dimensions.width) / 2,
    y: frame.y,
  };
}

export function createColorResolver(dagData: DagData, parentMap: ParentMap = buildParentMap(dagData)): ColorResolver {
  const colorCache = new Map<string, string>();

  return (id: string) => {
    if (colorCache.has(id)) return colorCache.get(id)!;

    const color = getInheritedColorDag(dagData, id, parentMap);
    colorCache.set(id, color);
    return color;
  };
}

export function buildVisibleNodeIds(dagData: DagData, expanded: Set<string>): Set<string> {
  const visible = new Set<string>();
  const stack = [dagData.root];
  const order = buildNodeOrder(dagData);

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visible.has(id)) continue;

    visible.add(id);
    const node = dagData.nodes[id];
    if (!node || !expanded.has(id)) continue;

    const children = sortNodeIds(node.children ?? [], order);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }

  return visible;
}

export function buildLayoutNodeIds(dagData: DagData): Set<string> {
  return new Set(Object.keys(dagData.nodes));
}

export function resolveElkSpacing(orientation: Orientation, hSpacing: number, vSpacing: number): ElkSpacing {
  return orientation === 'horizontal'
    ? { layer: hSpacing, node: vSpacing }
    : { layer: vSpacing, node: hSpacing };
}

export function createElkGraph(params: {
  dagData: DagData;
  layoutNodeIds: Set<string>;
  nodeSize: number;
  nodeShape: NodeShape;
  orientation: Orientation;
  hSpacing: number;
  vSpacing: number;
}): ElkGraphLayout {
  const {
    dagData,
    layoutNodeIds,
    nodeSize,
    nodeShape,
    orientation,
    hSpacing,
    vSpacing,
  } = params;

  const nodeDimensions = getNodeDimensions(nodeSize, nodeShape);
  const children: ElkNode[] = [];
  const edges: ElkExtendedEdge[] = [];
  const order = buildNodeOrder(dagData);
  const orderedLayoutIds = sortNodeIds(layoutNodeIds, order);

  for (const id of orderedLayoutIds) {
    const node = dagData.nodes[id];
    if (!node) continue;

    const labelWidth = estimateLabelWidth(node.name);
    children.push({
      id,
      width: Math.max(nodeDimensions.width, labelWidth),
      height: nodeDimensions.height + LABEL_HEIGHT,
      labels: [{ text: node.name, width: labelWidth, height: LABEL_HEIGHT }],
      layoutOptions: {
        'elk.layered.crossingMinimization.positionId': String(order.get(id) ?? 0),
      },
    });
  }

  for (const id of orderedLayoutIds) {
    const node = dagData.nodes[id];
    if (!node) continue;

    for (const childId of sortNodeIds(node.children ?? [], order)) {
      if (layoutNodeIds.has(childId)) {
        edges.push({ id: `e-${id}-${childId}`, sources: [id], targets: [childId] });
      }
    }
  }

  const spacing = resolveElkSpacing(orientation, hSpacing, vSpacing);
  const direction = orientation === 'vertical' ? 'DOWN' : 'RIGHT';

  return {
    graph: {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction,
        'elk.spacing.nodeNode': String(spacing.node),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing.layer),
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
        'elk.layered.crossingMinimization.semiInteractive': 'true',
        'elk.nodeLabels.placement': 'OUTSIDE H_CENTER V_TOP',
        'elk.nodeSize.constraints': 'NODE_LABELS MINIMUM_SIZE',
      },
      children,
      edges,
    },
    edges,
    nodeDimensions,
    spacing,
  };
}

function computeNodeDepths(dagData: DagData): Map<string, number> {
  const depths = new Map<string, number>([[dagData.root, 0]]);
  const stack = [dagData.root];

  while (stack.length > 0) {
    const id = stack.pop()!;
    const depth = depths.get(id) ?? 0;

    for (const childId of dagData.nodes[id]?.children ?? []) {
      const nextDepth = depth + 1;
      if ((depths.get(childId) ?? -1) >= nextDepth) continue;

      depths.set(childId, nextDepth);
      stack.push(childId);
    }
  }

  return depths;
}

function alignFramesToLayers(
  frames: Map<string, LayoutNodeFrame>,
  dagData: DagData,
  orientation: Orientation
): Map<string, LayoutNodeFrame> {
  const depths = computeNodeDepths(dagData);
  const anchors = new Map<number, number>();
  const depthAxis = orientation === 'horizontal' ? 'x' : 'y';
  const orthoAxis = orientation === 'horizontal' ? 'y' : 'x';
  const orthoSize = orientation === 'horizontal' ? 'height' : 'width';
  const MIN_SPACING = 10;

  // Step 1: Align nodes to their depth layer (depth axis)
  for (const [id, frame] of frames) {
    const depth = depths.get(id);
    if (depth === undefined) continue;

    const current = anchors.get(depth);
    const value = frame[depthAxis];
    anchors.set(depth, current === undefined ? value : Math.min(current, value));
  }

  // Step 2: Group nodes by depth for orthogonal separation
  const depthGroups = new Map<number, { id: string; frame: LayoutNodeFrame }[]>();
  for (const [id, frame] of frames) {
    const depth = depths.get(id);
    if (depth === undefined) continue;

    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push({ id, frame });
  }

  // Step 3: Separate nodes on orthogonal axis within each depth
  const separated = new Map<string, LayoutNodeFrame>();
  for (const [, group] of depthGroups) {
    // Sort by current orthogonal position to maintain relative order
    group.sort((a, b) => a.frame[orthoAxis] - b.frame[orthoAxis]);

    let currentOrthoPos = group[0].frame[orthoAxis];
    for (const { id, frame } of group) {
      const nodeSize = frame[orthoSize];
      const nextPos = Math.max(frame[orthoAxis], currentOrthoPos);
      separated.set(id, { ...frame, [orthoAxis]: nextPos });
      currentOrthoPos = nextPos + nodeSize + MIN_SPACING;
    }
  }

  // Step 4: Apply depth alignment while preserving orthogonal separation
  const aligned = new Map<string, LayoutNodeFrame>();
  for (const [id, frame] of separated) {
    const depth = depths.get(id);
    const anchor = depth === undefined ? undefined : anchors.get(depth);
    aligned.set(id, anchor === undefined ? frame : { ...frame, [depthAxis]: anchor });
  }

  return aligned;
}

export function mapElkNodeFrames(
  layouted: ElkNode,
  dagData: DagData,
  orientation: Orientation
): Map<string, LayoutNodeFrame> {
  const frames = new Map<string, LayoutNodeFrame>();

  for (const child of layouted.children ?? []) {
    frames.set(child.id, {
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: child.width ?? 0,
      height: child.height ?? 0,
    });
  }

  return alignFramesToLayers(frames, dagData, orientation);
}

function buildActivePathAndSubtree(
  dagData: DagData,
  visibleNodes: Set<string>,
  expanded: Set<string>,
  activeId: string,
  parentMap: ParentMap
): Set<string> {
  const activePathAndSubtree = new Set<string>();
  if (!activeId || !visibleNodes.has(activeId)) return activePathAndSubtree;

  const ancestorStack = [activeId];
  while (ancestorStack.length > 0) {
    const id = ancestorStack.pop()!;
    if (activePathAndSubtree.has(id)) continue;

    activePathAndSubtree.add(id);
    for (const parentId of getParents(dagData, id, parentMap)) {
      ancestorStack.push(parentId);
    }
  }

  const descendantStack = [activeId];
  while (descendantStack.length > 0) {
    const id = descendantStack.pop()!;
    if (!visibleNodes.has(id)) continue;

    activePathAndSubtree.add(id);
    if (!expanded.has(id)) continue;

    for (const childId of dagData.nodes[id]?.children ?? []) {
      descendantStack.push(childId);
    }
  }

  return activePathAndSubtree;
}

export function buildFlowElements(params: {
  dagData: DagData;
  visibleNodes: Set<string>;
  expanded: Set<string>;
  parentMap: ParentMap;
  activeId: string;
  searchQuery: string;
  nodeSize: number;
  nodeShape: NodeShape;
  orientation: Orientation;
  labelPosition: LabelPosition;
  nodeDimensions: NodeDimensions;
  spacing: ElkSpacing;
  elkEdges: ElkExtendedEdge[];
  nodeFrames: Map<string, LayoutNodeFrame>;
  getColor: ColorResolver;
}): FlowGraphElements {
  const {
    dagData,
    visibleNodes,
    expanded,
    parentMap,
    activeId,
    searchQuery,
    nodeSize,
    nodeShape,
    orientation,
    labelPosition,
    nodeDimensions,
    spacing,
    elkEdges,
    nodeFrames,
    getColor,
  } = params;

  const activePathAndSubtree = buildActivePathAndSubtree(dagData, visibleNodes, expanded, activeId, parentMap);
  const nodes: FlowNode<TaxonomyNodeData>[] = [];
  const edges: FlowEdge[] = [];
  const edgeType = edgeTypeFor(nodeShape);
  const clusterOffset = getClusterOffset(nodeSize, nodeShape, spacing);

  for (const id of visibleNodes) {
    const node = dagData.nodes[id];
    const frame = nodeFrames.get(id);
    if (!node || !frame) continue;

    const position = visualPosition(frame, nodeDimensions, orientation);
    const isDimmed = Boolean(activeId) && !activePathAndSubtree.has(id);
    const isExpanded = expanded.has(id);
    const hasChildren = Boolean(node.children?.length);
    const color = getColor(id);

    nodes.push({
      id,
      type: 'taxonomyNode',
      position,
      data: {
        id: node.id,
        name: node.name,
        color,
        image: node.image,
        iconChar: node.iconChar,
        iconFont: node.iconFont,
        attachments: node.attachments,
        hasChildren,
        isExpanded,
        searchQuery,
        nodeSize,
        nodeShape,
        orientation,
        labelPosition,
        hasMultipleParents: hasMultipleParents(dagData, id, parentMap),
      },
      style: transitionStyle(computeOpacity(isDimmed)),
    });

    if (hasChildren && !isExpanded && id !== dagData.root) {
      const clusterId = `${id}__cluster`;
      const clusterOpacity = computeOpacity(isDimmed, true);

      nodes.push({
        id: clusterId,
        type: 'taxonomyNode',
        position: {
          x: position.x + (orientation === 'horizontal' ? clusterOffset : 0),
          y: position.y + (orientation === 'vertical' ? clusterOffset : 0),
        },
        data: {
          id: clusterId,
          name: '',
          color,
          hasChildren: false,
          searchQuery,
          nodeSize: nodeSize * CLUSTER_SIZE_RATIO,
          nodeShape: 'circle',
          orientation,
          labelPosition,
          hasMultipleParents: false,
          isCluster: true,
          clusterCount: node.children?.length ?? 0,
        },
        style: transitionStyle(clusterOpacity),
      });

      edges.push({
        id: `e-${id}-${clusterId}`,
        source: id,
        target: clusterId,
        type: edgeType,
        style: {
          stroke: color,
          strokeWidth: 2,
          ...transitionStyle(clusterOpacity),
        },
      });
    }
  }

  for (const elkEdge of elkEdges) {
    const [parentId] = elkEdge.sources;
    const [childId] = elkEdge.targets;
    if (!parentId || !childId) continue;
    if (!expanded.has(parentId) || !visibleNodes.has(parentId) || !visibleNodes.has(childId)) continue;

    const isDimmed = Boolean(activeId)
      && (!activePathAndSubtree.has(parentId) || !activePathAndSubtree.has(childId));
    const color = getColor(parentId);

    edges.push({
      id: elkEdge.id,
      source: parentId,
      target: childId,
      type: edgeType,
      style: {
        stroke: color,
        strokeWidth: 2,
        ...transitionStyle(computeOpacity(isDimmed)),
      },
    });
  }

  return { nodes, edges };
}
