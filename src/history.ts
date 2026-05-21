import { useStore as useZustand } from 'zustand'
import { useStore } from './store'

/** Returns the undo function. Call it directly (not reactive). */
export const useUndo = () =>
  useZustand(useStore.temporal, (s) => s.undo)

/** Returns the redo function. Call it directly (not reactive). */
export const useRedo = () =>
  useZustand(useStore.temporal, (s) => s.redo)

/** True when there is history to undo. */
export const useCanUndo = () =>
  useZustand(useStore.temporal, (s) => s.pastStates.length > 0)

/** True when there is history to redo. */
export const useCanRedo = () =>
  useZustand(useStore.temporal, (s) => s.futureStates.length > 0)
