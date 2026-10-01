import type { ParamId } from '../../audio/parameters/types'

/**
 * Which parameter's modulation editor is disclosed.
 * UI only — this store never writes LFOs, automation, or AudioParams.
 */
const open = new Set<ParamId>()
const listeners = new Set<() => void>()

export function readModulationEditor(id: ParamId): boolean {
  return open.has(id)
}

export function setModulationEditorOpen(id: ParamId, next: boolean): void {
  const current = open.has(id)
  if (next === current && (!next || open.size === 1)) return
  open.clear()
  if (next) open.add(id)
  for (const listener of listeners) listener()
}

export function subscribeModulationEditor(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test helper. */
export function resetModulationEditors(): void {
  if (open.size === 0) return
  open.clear()
  for (const listener of listeners) listener()
}
