export type HistorySnapshot<T> = T

export type HistoryState<T> = {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] }
}

/** Commit a finished gesture. No-ops when the snapshot is unchanged. */
export function commitHistory<T>(state: HistoryState<T>, next: T, equals: (a: T, b: T) => boolean): HistoryState<T> {
  if (equals(state.present, next)) return state
  return {
    past: [...state.past, state.present],
    present: next,
    future: [],
  }
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const prev = state.past.at(-1)
  if (!prev) return state
  return {
    past: state.past.slice(0, -1),
    present: prev,
    future: [state.present, ...state.future],
  }
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const next = state.future[0]
  if (!next) return state
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  }
}
