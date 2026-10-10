import { blankSignal, diffGuideActions, freshBindings, type GuideSignal } from './actions'
import { currentStep } from './session'
import { reduceGuide, type GuideCommand, type GuideEnv, type GuideState } from './session'
import { INITIAL_GUIDE_STATE } from './session'
import { persistGuide, readPersistedGuide } from './storage'
import type { GuideModule, GuideTargetId } from './types'
import type { UiMode } from '../modes/uiMode'

export type GuideHost = {
  uiMode: UiMode | null
  focusActive: boolean
  menuOpen: boolean
  loadSample: () => void
  loadDemo: () => void
  setMode: (mode: UiMode) => void
  exitFocus: () => void
  revealTarget: (id: GuideTargetId, instanceId?: string | null) => void
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

function addingModules(): ReadonlySet<GuideModule> {
  const step = currentStep(state)
  const adding = new Set<GuideModule>()
  if (!step || step.completion.kind === 'manual' || !step.module) return adding
  if (step.completion.actions.some((action) => action.endsWith('.added'))) adding.add(step.module)
  return adding
}

export function noteGuideSignal(next: GuideSignal): void {
  const prev = signal
  signal = next
  const binds = freshBindings(prev ?? blankSignal(), next, state.bindings, addingModules())
  const actions = prev ? diffGuideActions(prev, next) : []
  let nextState = state
  if (binds) nextState = reduceGuide(nextState, { type: 'bind', bindings: binds })
  if (actions.length) nextState = reduceGuide(nextState, { type: 'actions', actions })
  if (nextState === state) return
  state = nextState
  emit()
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
