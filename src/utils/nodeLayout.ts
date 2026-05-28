export function getNodeDimensions(nodeSize: number, nodeShape: 'circle' | 'rect') {
  return {
    width: nodeSize * 2,
    height: nodeShape === 'circle' ? nodeSize * 2 : nodeSize * 1.1,
  };
}