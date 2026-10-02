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

function notify(): void {
  for (const listener of listeners) listener()
}

/**
 * Several controls can offer the same parameter. Only the one that was
 * opened may portal the shared editor.
 */
const portalOwner = new Map<ParamId, string>()

/** Snapshot for React. Includes the portal owner so a hand-off re-renders. */
export function modulationEditorView(id: ParamId): string {
  return `${open.has(id) ? 1 : 0}:${portalOwner.get(id) ?? ''}`
}

export function modulationPortalOwner(id: ParamId): string | null {
  return portalOwner.get(id) ?? null
}

export function preferModulationPortal(id: ParamId, token: string): void {
  if (portalOwner.get(id) === token) return
  portalOwner.set(id, token)
  notify()
}

export function modulationPortalOwnedBy(id: ParamId, token: string): boolean {
  const owner = portalOwner.get(id)
  if (owner == null) {
    portalOwner.set(id, token)
    return true
  }
  return owner === token
}

export function releaseModulationPortal(id: ParamId, token: string): void {
  if (portalOwner.get(id) !== token) return
  portalOwner.delete(id)
  notify()
}

/** Test helper. */
export function resetModulationEditors(): void {
  portalOwner.clear()
  if (open.size === 0) return
  open.clear()
  for (const listener of listeners) listener()
}
