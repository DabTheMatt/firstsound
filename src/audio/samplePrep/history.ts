export type History<T> = {
  current: T
  past: T[]
  future: T[]
}

export function createHistory<T>(current: T): History<T> {
  return { current, past: [], future: [] }
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0
}

/** Replace current without a history entry (live drag). */
export function live<T>(h: History<T>, current: T): History<T> {
  return { ...h, current }
}

/** One finished gesture / discrete action. */
export function commit<T>(h: History<T>, next: T, same: (a: T, b: T) => boolean, limit = 80): History<T> {
  if (same(h.current, next)) return { ...h, current: next }
  const past = [...h.past, h.current]
  if (past.length > limit) past.shift()
  return { current: next, past, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h
  const current = h.past[h.past.length - 1] as T
  return {
    current,
    past: h.past.slice(0, -1),
    future: [h.current, ...h.future],
  }
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h
  const current = h.future[0] as T
  return {
    current,
    past: [...h.past, h.current],
    future: h.future.slice(1),
  }
}

export function resetHistory<T>(current: T): History<T> {
  return createHistory(current)
}
