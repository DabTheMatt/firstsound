/** Open state for the marker sheet. Not a copy of marker data. */

type PanelState = {
  open: boolean
  focusToken: number
  /** Set when a shortcut just created a marker and the name field should open. */
  editId: string | null
}

let state: PanelState = { open: false, focusToken: 0, editId: null }
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function markerPanelState(): PanelState {
  return state
}

export function setMarkerPanelOpen(open: boolean, editId: string | null = null): void {
  const focusToken = open ? state.focusToken + 1 : state.focusToken
  const nextEdit = open ? editId : null
  if (state.open === open && state.focusToken === focusToken && state.editId === nextEdit) return
  state = { open, focusToken, editId: nextEdit }
  emit()
}

export function subscribeMarkerPanel(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetMarkerPanel(): void {
  state = { open: false, focusToken: 0, editId: null }
  emit()
}
