import type { FocusWorkspace } from '../../app/phoneWorkspace'
import type { VizMode } from '../../app/editorState'

/** Primary Technical activities. Hearing and 3D stay inside this set. */
export const TECHNICAL_WORKSPACES = ['wave', 'eq', 'fft', 'auto', 'hearing'] as const

export type TechnicalWorkspaceId = (typeof TECHNICAL_WORKSPACES)[number]

export function workspaceFromViz(viz: VizMode, hearing: boolean): TechnicalWorkspaceId {
  if (hearing) return 'hearing'
  if (viz === 'automation') return 'auto'
  if (viz === 'eq-split') return 'eq'
  if (viz === 'spectrum' || viz === 'split') return 'fft'
  return 'wave'
}

/** Viz to show for a workspace. Hearing keeps the current viz and uses its own stage. */
export function vizForWorkspace(id: TechnicalWorkspaceId): VizMode | null {
  if (id === 'hearing') return null
  if (id === 'auto') return 'automation'
  if (id === 'eq') return 'eq-split'
  if (id === 'fft') return 'spectrum'
  return 'waveform'
}

export function focusWorkspaceId(id: TechnicalWorkspaceId): FocusWorkspace {
  return id
}
