/**
 * Application destination. SHED and Activity are not audio editing modes.
 * The selected Simple / Technical / Sensory mode stays with the session.
 *
 * Activity and the architectural view stay in the codebase. This version does not offer them.
 */
export const ACTIVITY_VISIBLE = false
export const SHED_VISIBLE = false

export const APP_VIEWS = ['workspace', 'activity', 'shed'] as const

export type AppView = (typeof APP_VIEWS)[number]

export type AppSessionView = {
  view: AppView
  mode: string
}

export function parseAppView(raw: string | null | undefined): AppView | null {
  if (raw && (APP_VIEWS as readonly string[]).includes(raw)) return raw as AppView
  return null
}

/** Changes the destination and leaves the editing mode untouched. */
export function applyAppView<T extends AppSessionView>(session: T, view: AppView): T {
  if (session.view === view) return session
  return { ...session, view }
}
