import type { UiMode } from '../modes/uiMode'
import type { HelpTopicId } from './copy'

/** Picture the help window can describe. Matches the technical workspaces. */
export type HelpView = 'wave' | 'eq' | 'fft' | 'auto' | 'hearing'

export type HelpEffect =
  | 'gain'
  | 'output'
  | 'grain'
  | 'eq'
  | 'filter'
  | 'midside'
  | 'distortion'
  | 'delay'
  | 'reverb'
  | 'compressor'
  | 'limiter'

const HELP_EFFECTS = new Set<string>([
  'gain',
  'output',
  'grain',
  'eq',
  'filter',
  'midside',
  'distortion',
  'delay',
  'reverb',
  'compressor',
  'limiter',
])

export function helpEffectFrom(type: string | null | undefined): HelpEffect | null {
  return type && HELP_EFFECTS.has(type) ? (type as HelpEffect) : null
}

export type HelpFollow = 'effect' | 'view'

export type HelpPlace = {
  mode: UiMode
  view: HelpView
  focused: boolean
  effect: HelpEffect | null
  /** Effect click follows the module. A picture click follows the view. */
  follow: HelpFollow
}

export type HelpScope = 'general' | 'context'

const SCOPE_KEY = 'field.help.scope'
const scopeListeners = new Set<() => void>()

const INITIAL_PLACE: HelpPlace = { mode: 'technical', view: 'wave', focused: false, effect: null, follow: 'view' }

let detail: string | null = null
const detailListeners = new Set<() => void>()

function emitDetail(): void {
  for (const listener of detailListeners) listener()
}

export function publishHelpDetail(id: string | null): void {
  if (detail === id) return
  detail = id
  emitDetail()
}

export function getHelpDetail(): string | null {
  return detail
}

export function subscribeHelpDetail(listener: () => void): () => void {
  detailListeners.add(listener)
  return () => detailListeners.delete(listener)
}

let place: HelpPlace = INITIAL_PLACE
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function publishHelpPlace(next: HelpPlace): void {
  const same =
    place.mode === next.mode &&
    place.view === next.view &&
    place.focused === next.focused &&
    place.effect === next.effect &&
    place.follow === next.follow
  if (same) return
  const clearDetail = place.effect !== next.effect || place.focused !== next.focused
  place = next
  emit()
  if (clearDetail) publishHelpDetail(null)
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
  publishHelpDetail(null)
}

/**
 * Focus describes the picture.
 * An effect click describes that module, including Input and Output.
 * Otherwise the open view. The EQ picture describes the equalizer.
 */
export function helpTopic(current: HelpPlace = place): HelpTopicId {
  if (current.mode === 'simple') return 'simple'
  if (current.mode === 'sensory') return 'sensory'
  if (current.focused) return current.view === 'eq' ? 'eq-focus' : `${current.view}-focus`
  const subject = helpSubject(current)
  if (!subject) return current.view === 'eq' ? 'eq' : current.view
  return effectTopic(subject)
}

/** Module whose parameters belong under the current contextual topic. */
export function helpSubject(current: HelpPlace = place): HelpEffect | null {
  if (current.mode !== 'technical') return null
  if (current.focused) return current.view === 'eq' ? 'eq' : null
  if (current.follow === 'effect') return current.effect
  if (current.view === 'eq') return 'eq'
  return null
}

function effectTopic(effect: HelpEffect): HelpTopicId {
  if (effect === 'gain') return 'fx-input'
  if (effect === 'output') return 'fx-output'
  if (effect === 'eq') return 'eq'
  if (effect === 'filter') return 'fx-filter'
  if (effect === 'grain') return 'fx-grain'
  if (effect === 'distortion') return 'fx-distortion'
  if (effect === 'midside') return 'fx-midside'
  if (effect === 'delay') return 'fx-delay'
  if (effect === 'reverb') return 'fx-reverb'
  if (effect === 'compressor') return 'fx-compressor'
  return 'fx-limiter'
}

export function readHelpScope(): HelpScope {
  try {
    return localStorage.getItem(SCOPE_KEY) === 'general' ? 'general' : 'context'
  } catch {
    return 'context'
  }
}

export function subscribeHelpScope(listener: () => void): () => void {
  scopeListeners.add(listener)
  return () => scopeListeners.delete(listener)
}

export function writeHelpScope(scope: HelpScope): void {
  try {
    localStorage.setItem(SCOPE_KEY, scope === 'general' ? 'general' : 'context')
  } catch {
    /* private mode */
  }
  for (const listener of scopeListeners) listener()
}
