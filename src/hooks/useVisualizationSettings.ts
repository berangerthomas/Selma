import usePersistedState from './usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';
import type { NodeShape, Orientation, LabelPosition } from '../types';

export type { NodeShape, Orientation, LabelPosition };

export function useVisualizationSettings() {
  const [nodeSize, setNodeSizeState] = usePersistedState<number>(
    STORAGE_KEYS.nodeSize,
    26,
    (v) => String(v),
    (s) => Number(s)
  );
  const setNodeSize = (n: number) => setNodeSizeState(n);

  const [hSpacing, setHSpacingState] = usePersistedState<number>(
    STORAGE_KEYS.hSpacing,
    220,
    (v) => String(v),
    (s) => Number(s)
  );
  const setHSpacing = (n: number) => setHSpacingState(n);

  const [vSpacing, setVSpacingState] = usePersistedState<number>(
    STORAGE_KEYS.vSpacing,
    80,
    (v) => String(v),
    (s) => Number(s)
  );
  const setVSpacing = (n: number) => setVSpacingState(n);

  const [nodeShape, setNodeShapeState] = usePersistedState<NodeShape>(
    STORAGE_KEYS.nodeShape,
    'circle',
    (v) => v,
    (s) => (s as NodeShape) || 'circle'
  );
  const setNodeShape = (s: NodeShape) => setNodeShapeState(s);

  const [orientation, setOrientationState] = usePersistedState<Orientation>(
    STORAGE_KEYS.orientation,
    'horizontal',
    (v) => v,
    (s) => (s as Orientation) || 'horizontal'
  );
  const setOrientation = (o: Orientation) => setOrientationState(o);

  const [labelPosition, setLabelPositionState] = usePersistedState<LabelPosition>(
    STORAGE_KEYS.labelPosition,
    'smart',
    (v) => v,
    (s) => {
      if (s === 'auto') {
        // Migration: 'auto' was renamed to 'smart'
        return 'smart';
      }
      return (s as LabelPosition) || 'smart';
    }
  );
  const setLabelPosition = (lp: LabelPosition) => setLabelPositionState(lp);

  return {
    nodeSize,
    setNodeSize,
    hSpacing,
    setHSpacing,
    vSpacing,
    setVSpacing,
    nodeShape,
    setNodeShape,
    orientation,
    setOrientation,
    labelPosition,
    setLabelPosition,
  };
}