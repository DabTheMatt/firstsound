export const EQ_WORKSPACE_LAYOUT_KEY = 'field.eqWorkspaceLayout'

/** EQ workspace presentation. Inspector is the default; strips sit under the graph. */
export const EQ_WORKSPACE_LAYOUTS = ['strips', 'inspector'] as const

export type EqWorkspaceLayout = (typeof EQ_WORKSPACE_LAYOUTS)[number]

export function parseEqWorkspaceLayout(raw: string | null | undefined): EqWorkspaceLayout {
  return raw === 'strips' ? 'strips' : 'inspector'
}

export function readStoredEqWorkspaceLayout(): EqWorkspaceLayout {
  try {
    return parseEqWorkspaceLayout(localStorage.getItem(EQ_WORKSPACE_LAYOUT_KEY))
  } catch {
    return 'inspector'
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
