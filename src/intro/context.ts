import type { UiMode } from '../modes/uiMode'
import type { HelpTopicId } from './copy'

/** Picture the help window can describe. Matches the technical workspaces. */
export type HelpView = 'wave' | 'eq' | 'fft' | 'auto' | 'hearing'

export type HelpEffect =
  | 'grain'
  | 'eq'
  | 'filter'
  | 'midside'
  | 'distortion'
  | 'delay'
  | 'reverb'
  | 'compressor'
  | 'limiter'

const HELP_EFFECTS = new Set<string>(['grain', 'eq', 'filter', 'midside', 'distortion', 'delay', 'reverb', 'compressor', 'limiter'])

export function helpEffectFrom(type: string | null | undefined): HelpEffect | null {
  return type && HELP_EFFECTS.has(type) ? (type as HelpEffect) : null
}

export type HelpPlace = {
  mode: UiMode
  view: HelpView
  focused: boolean
  effect: HelpEffect | null
}

export type HelpScope = 'general' | 'context'

const SCOPE_KEY = 'field.help.scope'

const INITIAL_PLACE: HelpPlace = { mode: 'technical', view: 'wave', focused: false, effect: null }

let place: HelpPlace = INITIAL_PLACE
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function publishHelpPlace(next: HelpPlace): void {
  if (place.mode === next.mode && place.view === next.view && place.focused === next.focused && place.effect === next.effect) return
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

/**
 * Simple and Sensory ignore the picture.
 * The EQ picture, including EQ Focus, describes the equalizer.
 * Another selected effect describes that effect.
 * Otherwise the open view, and Focus when it is on.
 */
export function helpTopic(current: HelpPlace = place): HelpTopicId {
  if (current.mode === 'simple') return 'simple'
  if (current.mode === 'sensory') return 'sensory'
  if (current.view === 'eq' && current.focused) return 'eq-focus'
  if (current.view === 'eq' || current.effect === 'eq') return 'eq'
  if (current.effect) return effectTopic(current.effect)
  return current.focused ? `${current.view}-focus` : current.view
}

function effectTopic(effect: Exclude<HelpEffect, 'eq'>): HelpTopicId {
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

export function writeHelpScope(scope: HelpScope): void {
  try {
    localStorage.setItem(SCOPE_KEY, scope === 'general' ? 'general' : 'context')
  } catch {
    /* private mode */
  }
}
