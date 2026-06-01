import type { NodeShape } from '../types';

export type NodeDimensions = {
  width: number;
  height: number;
};

export function getNodeDimensions(nodeSize: number, nodeShape: NodeShape): NodeDimensions {
  return {
    width: nodeSize * 2,
    height: nodeShape === 'circle' ? nodeSize * 2 : nodeSize * 1.1,
  };
}
