import { useCallback } from 'react';
import usePersistedState from './usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';
import type { NodeShape, Orientation, LabelPosition } from '../types';

export type { NodeShape, Orientation, LabelPosition };

export function useVisualizationSettings() {
  const serializeNumber = useCallback((v: number) => String(v), []);
  const deserializeNumber = useCallback((s: string) => Number(s), []);

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

  const serializeString = useCallback((v: string) => v, []);

  const deserializeNodeShape = useCallback((s: string) => (s as NodeShape) || 'circle', []);

  const [nodeShape, setNodeShape] = usePersistedState<NodeShape>(
    STORAGE_KEYS.nodeShape,
    'circle',
    serializeString,
    deserializeNodeShape
  );

  const deserializeOrientation = useCallback((s: string) => (s as Orientation) || 'horizontal', []);
  const [orientation, setOrientation] = usePersistedState<Orientation>(
    STORAGE_KEYS.orientation,
    'horizontal',
    serializeString,
    deserializeOrientation
  );

  const deserializeLabelPosition = useCallback((s: string) => {
    if (s === 'auto') return 'smart';
    return (s as LabelPosition) || 'smart';
  }, []);

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