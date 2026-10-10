import { diffGuideActions, type GuideSignal } from './actions'
import { reduceGuide, type GuideCommand, type GuideEnv, type GuideState } from './session'
import { INITIAL_GUIDE_STATE } from './session'
import { persistGuide, readPersistedGuide } from './storage'
import type { GuideTargetId } from './types'
import type { UiMode } from '../modes/uiMode'

export type GuideHost = {
  uiMode: UiMode | null
  focusActive: boolean
  menuOpen: boolean
  loadSample: () => void
  loadDemo: () => void
  setMode: (mode: UiMode) => void
  exitFocus: () => void
  revealTarget: (id: GuideTargetId) => void
}

const defaultHost: GuideHost = {
  uiMode: null,
  focusActive: false,
  menuOpen: false,
  loadSample: () => undefined,
  loadDemo: () => undefined,
  setMode: () => undefined,
  exitFocus: () => undefined,
  revealTarget: () => undefined,
}

let state: GuideState = readPersistedGuide()
let signal: GuideSignal | null = null
let host: GuideHost = defaultHost
const listeners = new Set<() => void>()

function emit(): void {
  persistGuide(state)
  for (const listener of listeners) listener()
}

export function getGuideState(): GuideState {
  return state
}

export function getGuideSignal(): GuideSignal | null {
  return signal
}

export function getGuideHost(): GuideHost {
  return host
}

export function subscribeGuide(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function dispatchGuide(command: GuideCommand): void {
  const next = reduceGuide(state, command)
  if (next === state) return
  state = next
  emit()
}

export function setGuideHost(next: GuideHost): void {
  host = next
}

export function noteGuideSignal(next: GuideSignal): void {
  const prev = signal
  signal = next
  if (!prev) {
    emit()
    return
  }
  const actions = diffGuideActions(prev, next)
  if (!actions.length) return
  dispatchGuide({ type: 'actions', actions })
}

export function guideEnv(): GuideEnv {
  return {
    sampleLoaded: Boolean(signal?.sampleLoaded),
    uiMode: host.uiMode,
  }
}

export function resetGuideForTests(next: GuideState = INITIAL_GUIDE_STATE): void {
  state = next
  signal = null
}
