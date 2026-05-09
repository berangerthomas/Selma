import { useReducer, useCallback, useRef } from 'react';
import type { TreeNode } from '../types';
import { findNodePath } from '../utils/treeUtils';

type HistoryState = { stack: string[]; index: number };
type HistoryAction = 
  | { type: 'PUSH'; id: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'PUSH': {
      if (state.stack[state.index] === action.id) return state;
      const newStack = state.stack.slice(0, state.index + 1);
      return { stack: [...newStack, action.id], index: newStack.length };
    }
    case 'GO_BACK':
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case 'GO_FORWARD':
      return state.index < state.stack.length - 1 ? { ...state, index: state.index + 1 } : state;
    default:
      return state;
  }
}

export function useNavigationHistory(
  data: TreeNode | null,
  setExpanded: (setter: React.SetStateAction<Set<string>>) => void,
  setActiveId: (id: string) => void,
  setForceCenterOnActive: (v: boolean) => void
) {
  const [history, dispatchHistory] = useReducer(historyReducer, { stack: [], index: -1 });
  const isNavigatingHistory = useRef(false);

  const historyStack = history.stack;
  const historyIndex = history.index;

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  // Push to history when activeId changes
  // This effect runs in the component that uses this hook (TreeContext)
  // We'll call pushHistory manually instead

  const pushHistory = useCallback((id: string) => {
    dispatchHistory({ type: 'PUSH', id });
  }, []);

  const navigateHistory = useCallback((direction: 'back' | 'forward') => {
    const newIndex = direction === 'back' ? historyIndex - 1 : historyIndex + 1;
    if (newIndex < 0 || newIndex >= historyStack.length || !data) return;
    const targetId = historyStack[newIndex];
    isNavigatingHistory.current = true;
    dispatchHistory({ type: direction === 'back' ? 'GO_BACK' : 'GO_FORWARD' });
    const path = findNodePath(data, targetId)?.map(n => n.id);
    if (path) {
      setExpanded(new Set(path));
      setActiveId(targetId);
      setForceCenterOnActive(true);
    }
  }, [historyIndex, historyStack, data, setExpanded, setActiveId, setForceCenterOnActive]);

  const goBack = useCallback(() => navigateHistory('back'), [navigateHistory]);
  const goForward = useCallback(() => navigateHistory('forward'), [navigateHistory]);

  return {
    pushHistory,
    isNavigatingHistory,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
  };
}