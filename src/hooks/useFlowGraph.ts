import { useEffect, useRef, useState } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { DagData, LabelPosition, NodeShape, Orientation } from '../types';
import { buildParentMap } from '../utils/dagUtils';
import {
  buildFlowElements,
  buildVisibleNodeIds,
  createColorResolver,
  createElkGraph,
  mapElkNodeFrames,
  type ElkGraphLayout,
  type FlowGraphElements,
  type LayoutNodeFrame,
} from '../utils/flowLayout';

const elk = new ELK();
const EMPTY_FLOW_GRAPH: FlowGraphElements = { nodes: [], edges: [] };

type LayoutState = {
  dagData: DagData;
  parentMap: Map<string, string[]>;
  getColor: (id: string) => string;
  layout: ElkGraphLayout;
  nodeFrames: Map<string, LayoutNodeFrame>;
  nodeSize: number;
  nodeShape: NodeShape;
  orientation: Orientation;
  visibleNodes: Set<string>;
};

export function useFlowGraph(
  dagData: DagData | null,
  expanded: Set<string>,
  activeId: string,
  searchQuery: string,
  nodeSize: number,
  nodeShape: NodeShape,
  orientation: Orientation,
  labelPosition: LabelPosition,
  hSpacing: number,
  vSpacing: number
) {
  const [result, setResult] = useState<FlowGraphElements>(EMPTY_FLOW_GRAPH);
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null);

  // Store previous node frames to anchor the layout and prevent jarring jumps.
  const prevFramesRef = useRef<Map<string, LayoutNodeFrame> | null>(null);

  // Effect 1: Compute ELK layout dynamically for visible nodes only.
  // Whenever expanded set changes, we recompute layout for the new visible set,
  // ensuring nodes are tightly packed based on what's actually shown.
  // To avoid disorienting the user, we translate the new layout so that the active
  // node (or root if none) stays at its previous position.
  useEffect(() => {
    if (!dagData) {
      setLayoutState(null);
      setResult(EMPTY_FLOW_GRAPH);
      return;
    }

    let cancelled = false;

    const parentMap = buildParentMap(dagData);
    const getColor = createColorResolver(dagData, parentMap);
    const visibleNodes = buildVisibleNodeIds(dagData, expanded);
    const layout = createElkGraph({
      dagData,
      layoutNodeIds: visibleNodes,
      nodeSize,
      nodeShape,
      orientation,
      hSpacing,
      vSpacing,
    });

    elk.layout(layout.graph)
      .then((layouted) => {
        if (cancelled) return;

        let nodeFrames = mapElkNodeFrames(layouted, dagData, orientation);

        // Anchor the new layout to the previous position of the anchor node
        // (activeId if visible, otherwise root) to prevent jarring jumps.
        const prevFrames = prevFramesRef.current;
        if (prevFrames && prevFrames.size > 0) {
          const anchorId = visibleNodes.has(activeId) ? activeId : dagData.root;
          const oldPos = prevFrames.get(anchorId);
          const newPos = nodeFrames.get(anchorId);
          if (oldPos && newPos) {
            const dx = oldPos.x - newPos.x;
            const dy = oldPos.y - newPos.y;
            if (dx !== 0 || dy !== 0) {
              const translated = new Map<string, LayoutNodeFrame>();
              for (const [id, frame] of nodeFrames) {
                translated.set(id, { ...frame, x: frame.x + dx, y: frame.y + dy });
              }
              nodeFrames = translated;
            }
          }
        }

        prevFramesRef.current = nodeFrames;

        setLayoutState({
          dagData,
          parentMap,
          getColor,
          layout,
          nodeFrames,
          nodeSize,
          nodeShape,
          orientation,
          visibleNodes,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.error('useFlowGraph: ELK layout failed', error);
        }
        setResult(EMPTY_FLOW_GRAPH);
      });

    return () => {
      cancelled = true;
    };
  }, [dagData, expanded, nodeSize, nodeShape, orientation, hSpacing, vSpacing, activeId]);

  // Effect 2: Build React Flow nodes/edges from the current layout state.
  useEffect(() => {
    if (!dagData || !layoutState || layoutState.dagData !== dagData) return;

    // Use the same visible node set used during layout computation.
    // We recompute it here as a safety measure; it should match layoutState.visibleNodes
    // since dagData and expanded are the same.
    const visibleNodes = buildVisibleNodeIds(dagData, expanded);
    setResult(buildFlowElements({
      dagData,
      visibleNodes,
      expanded,
      parentMap: layoutState.parentMap,
      activeId,
      searchQuery,
      nodeSize: layoutState.nodeSize,
      nodeShape: layoutState.nodeShape,
      orientation: layoutState.orientation,
      labelPosition,
      nodeDimensions: layoutState.layout.nodeDimensions,
      spacing: layoutState.layout.spacing,
      elkEdges: layoutState.layout.edges,
      nodeFrames: layoutState.nodeFrames,
      getColor: layoutState.getColor,
    }));
  }, [dagData, layoutState, expanded, activeId, searchQuery, labelPosition]);

  return result;
}