export const EQ_WORKSPACE_LAYOUT_KEY = 'field.eqWorkspaceLayout'

/** EQ workspace presentation. Strips sit under the graph; inspector is the side context. */
export const EQ_WORKSPACE_LAYOUTS = ['strips', 'inspector'] as const

export type EqWorkspaceLayout = (typeof EQ_WORKSPACE_LAYOUTS)[number]

export function parseEqWorkspaceLayout(raw: string | null | undefined): EqWorkspaceLayout {
  return raw === 'inspector' ? 'inspector' : 'strips'
}

export function readStoredEqWorkspaceLayout(): EqWorkspaceLayout {
  try {
    return parseEqWorkspaceLayout(localStorage.getItem(EQ_WORKSPACE_LAYOUT_KEY))
  } catch {
    return 'strips'
  }
}

const listeners = new Set<() => void>()

export function persistEqWorkspaceLayout(next: EqWorkspaceLayout): void {
  try {
    localStorage.setItem(EQ_WORKSPACE_LAYOUT_KEY, next)
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener()
}

export function subscribeEqWorkspaceLayout(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
