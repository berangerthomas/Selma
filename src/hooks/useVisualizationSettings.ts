import usePersistedState from './usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';
import type { NodeShape, Orientation, LabelPosition } from '../types';

export type { NodeShape, Orientation, LabelPosition };

// Module-level serializers — pure functions, no hook dependencies
const serializeNumber = (v: number) => String(v);
const deserializeNumber = (s: string) => Number(s);
const serializeString = (v: string) => v;
const deserializeNodeShape = (s: string) => (s as NodeShape) || 'circle';
const deserializeOrientation = (s: string) => (s as Orientation) || 'horizontal';
const deserializeLabelPosition = (s: string) => {
  if (s === 'auto') return 'smart';
  return (s as LabelPosition) || 'smart';
};

export function useVisualizationSettings() {
  const [nodeSize, setNodeSize] = usePersistedState<number>(
    STORAGE_KEYS.nodeSize,
    26,
    serializeNumber,
    deserializeNumber
  );

  const [hSpacing, setHSpacing] = usePersistedState<number>(
    STORAGE_KEYS.hSpacing,
    220,
    serializeNumber,
    deserializeNumber
  );

  const [vSpacing, setVSpacing] = usePersistedState<number>(
    STORAGE_KEYS.vSpacing,
    80,
    serializeNumber,
    deserializeNumber
  );

  const [nodeShape, setNodeShape] = usePersistedState<NodeShape>(
    STORAGE_KEYS.nodeShape,
    'circle',
    serializeString,
    deserializeNodeShape
  );

  const [orientation, setOrientation] = usePersistedState<Orientation>(
    STORAGE_KEYS.orientation,
    'horizontal',
    serializeString,
    deserializeOrientation
  );

  const [labelPosition, setLabelPosition] = usePersistedState<LabelPosition>(
    STORAGE_KEYS.labelPosition,
    'smart',
    serializeString,
    deserializeLabelPosition
  );

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