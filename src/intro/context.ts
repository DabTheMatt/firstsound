import type { UiMode } from '../modes/uiMode'

/** Picture the help window can describe. Matches the technical workspaces. */
export type HelpView = 'wave' | 'eq' | 'fft' | 'auto' | 'hearing'

export type HelpPlace = {
  mode: UiMode
  view: HelpView
  focused: boolean
}

export type HelpScope = 'general' | 'context'

export type HelpTopicId =
  | 'simple'
  | 'sensory'
  | 'wave'
  | 'wave-focus'
  | 'eq'
  | 'eq-focus'
  | 'fft'
  | 'fft-focus'
  | 'auto'
  | 'auto-focus'
  | 'hearing'
  | 'hearing-focus'

const SCOPE_KEY = 'field.help.scope'

const INITIAL_PLACE: HelpPlace = { mode: 'technical', view: 'wave', focused: false }

let place: HelpPlace = INITIAL_PLACE
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function publishHelpPlace(next: HelpPlace): void {
  if (place.mode === next.mode && place.view === next.view && place.focused === next.focused) return
  place = next
  emit()
}

export function getHelpPlace(): HelpPlace {
  return place
}

export function subscribeHelpPlace(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetHelpPlace(): void {
  place = INITIAL_PLACE
  emit()
}

/** Simple and Sensory ignore the picture. Technical follows the open view, and Focus when it is on. */
export function helpTopic(current: HelpPlace = place): HelpTopicId {
  if (current.mode === 'simple') return 'simple'
  if (current.mode === 'sensory') return 'sensory'
  return current.focused ? `${current.view}-focus` : current.view
}

export function readHelpScope(): HelpScope {
  try {
    return localStorage.getItem(SCOPE_KEY) === 'general' ? 'general' : 'context'
  } catch {
    return 'context'
  }
}

export function writeHelpScope(scope: HelpScope): void {
  try {
    localStorage.setItem(SCOPE_KEY, scope === 'general' ? 'general' : 'context')
  } catch {
    /* private mode */
  }
}
