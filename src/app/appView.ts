/**
 * Application destination. SHED is not an audio editing mode.
 * The selected Simple / Technical / Sensory mode stays with the session.
 *
 * The architectural view stays in the codebase. This version does not offer it.
 */
export const SHED_VISIBLE = false

export const APP_VIEWS = ['workspace', 'shed'] as const

export type AppView = (typeof APP_VIEWS)[number]

export type AppSessionView = {
  view: AppView
  mode: string
}

export function parseAppView(raw: string | null | undefined): AppView | null {
  if (raw === 'workspace' || raw === 'shed') return raw
  return null
}

/** Changes the destination and leaves the editing mode untouched. */
export function applyAppView<T extends AppSessionView>(session: T, view: AppView): T {
  if (session.view === view) return session
  return { ...session, view }
}
