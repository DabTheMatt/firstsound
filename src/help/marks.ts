export const EXPLAIN_MARKS_KEY = 'field.explainMarks'

type Listener = () => void

const listeners = new Set<Listener>()

function readStored(): boolean {
  try {
    return localStorage.getItem(EXPLAIN_MARKS_KEY) === 'on'
  } catch {
    return false
  }
}

let enabled = readStored()

export function parseExplainMarks(raw: string | null | undefined): boolean {
  return raw === 'on'
}

export function explainMarksOn(): boolean {
  return enabled
}

export function subscribeExplainMarks(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setExplainMarks(on: boolean): void {
  const next = on === true
  if (enabled === next) return
  enabled = next
  try {
    localStorage.setItem(EXPLAIN_MARKS_KEY, next ? 'on' : 'off')
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener()
}
