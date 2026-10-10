import { projectSatisfies, type GuideBindings, type GuideSignal } from './actions'
import { presentStep, visibleSteps } from './present'
import { taskById } from './tasks'
import type { GuideAction, GuideModule, GuidePanelMode, GuideSlot, GuideStep, GuideTask, GuideView } from './types'

export type Readiness = 'waiting' | 'done' | 'already'

export type GuideState = {
  view: GuideView
  panel: GuidePanelMode
  slot: GuideSlot
  float: { x: number; y: number } | null
  taskId: string | null
  stepIndex: number
  /** Actions that happened during this task. Cleared only on restart. */
  taskActions: GuideAction[]
  /** Actions since the current step was entered. Drives the success line. */
  stepActions: GuideAction[]
  autoAdvance: boolean
  learnQuery: string
  learnTopicId: string | null
  notice: 'back-keeps-edits' | null
  /** Effect instance the task is following. Not audio data. */
  bindings: GuideBindings
}

export type GuideEnv = {
  sampleLoaded: boolean
  uiMode: 'simple' | 'technical' | 'sensory' | null
}

export const INITIAL_GUIDE_STATE: GuideState = {
  view: 'closed',
  panel: 'docked',
  slot: 'bottom-left',
  float: null,
  taskId: null,
  stepIndex: 0,
  taskActions: [],
  stepActions: [],
  autoAdvance: false,
  learnQuery: '',
  learnTopicId: null,
  notice: null,
  bindings: {},
}

export type GuideCommand =
  | { type: 'open-library' }
  | { type: 'open-learn' }
  | { type: 'close' }
  | { type: 'minimize' }
  | { type: 'restore' }
  | { type: 'dock' }
  | { type: 'float' }
  | { type: 'set-slot'; slot: GuideSlot }
  | { type: 'set-float'; float: { x: number; y: number } }
  | { type: 'start'; taskId: string; env: GuideEnv }
  | { type: 'sample-arrived'; env: GuideEnv }
  | { type: 'confirm-mode' }
  | { type: 'stay-mode' }
  | { type: 'ask-focus' }
  | { type: 'cancel-focus' }
  | { type: 'actions'; actions: readonly GuideAction[] }
  | { type: 'bind'; bindings: GuideBindings }
  | { type: 'next'; signal: GuideSignal | null; mode?: GuideEnv['uiMode'] }
  | { type: 'back'; mode?: GuideEnv['uiMode']; signal?: GuideSignal | null }
  | { type: 'skip'; signal: GuideSignal | null; mode?: GuideEnv['uiMode'] }
  | { type: 'retarget'; mode: GuideEnv['uiMode']; signal: GuideSignal | null }
  | { type: 'restart' }
  | { type: 'set-auto'; value: boolean }
  | { type: 'set-query'; query: string }
  | { type: 'open-topic'; id: string | null }

function latch(existing: readonly GuideAction[], incoming: readonly GuideAction[]): GuideAction[] {
  if (!incoming.length) return existing as GuideAction[]
  const next = [...existing]
  for (const action of incoming) {
    if (!next.includes(action)) next.push(action)
  }
  return next
}

function enterTask(state: GuideState): GuideState {
  return { ...state, view: 'task', panel: state.panel === 'minimized' ? 'docked' : state.panel, stepActions: [], notice: null }
}

function routeAfterSample(state: GuideState, env: GuideEnv): GuideState {
  const task = taskById(state.taskId)
  if (!task) return { ...state, view: 'library' }
  if (task.preferredMode !== 'any' && env.uiMode && task.preferredMode !== env.uiMode) {
    return { ...state, view: 'mode-ask', stepIndex: 0, stepActions: [] }
  }
  return enterTask({ ...state, stepIndex: 0, stepActions: [] })
}

export function currentStep(state: GuideState): GuideStep | null {
  const task = taskById(state.taskId)
  if (!task) return null
  return task.steps[state.stepIndex] ?? null
}

export function readiness(step: GuideStep, state: GuideState, signal: GuideSignal | null): Readiness {
  if (step.completion.kind === 'manual') return 'waiting'
  const actions = step.completion.actions
  const inStep = (action: GuideAction) => state.stepActions.includes(action)
  const latched = (action: GuideAction) =>
    state.taskActions.includes(action) || (signal ? projectSatisfies(action, signal) : false)
  if (step.completion.kind === 'all') {
    if (actions.every(inStep)) return 'done'
    if (actions.every((action) => inStep(action) || latched(action))) return 'already'
    return 'waiting'
  }
  if (actions.some(inStep)) return 'done'
  if (actions.some(latched)) return 'already'
  return 'waiting'
}

export function canAdvance(step: GuideStep, state: GuideState, signal: GuideSignal | null): boolean {
  if (step.completion.kind === 'manual') return true
  return readiness(step, state, signal) !== 'waiting'
}

function shown(step: GuideStep, mode: GuideEnv['uiMode'] | undefined): GuideStep {
  return presentStep(step, mode ?? 'simple')
}

function goToStep(state: GuideState, task: GuideTask, step: GuideStep | undefined, notice: GuideState['notice']): GuideState {
  if (!step) {
    return { ...state, view: 'done', stepIndex: task.steps.length, stepActions: [], notice: null }
  }
  const index = task.steps.findIndex((item) => item.id === step.id)
  if (index < 0) return state
  return { ...state, view: 'task', stepIndex: index, stepActions: [], notice }
}

export function reduceGuide(state: GuideState, command: GuideCommand): GuideState {
  switch (command.type) {
    case 'open-library':
      return { ...state, view: 'library', panel: state.panel === 'minimized' ? 'docked' : state.panel, notice: null }
    case 'open-learn':
      return { ...state, view: 'learn', panel: state.panel === 'minimized' ? 'docked' : state.panel }
    case 'close':
      return { ...state, view: 'closed', notice: null }
    case 'minimize':
      if (state.view === 'closed') return state
      return { ...state, panel: 'minimized' }
    case 'restore':
      if (state.view === 'closed') return { ...state, view: state.taskId ? 'task' : 'library', panel: 'docked' }
      return { ...state, panel: 'docked' }
    case 'dock':
      return { ...state, panel: 'docked' }
    case 'float':
      return { ...state, panel: 'floating', float: state.float ?? { x: 24, y: 72 } }
    case 'set-slot':
      return state.slot === command.slot ? state : { ...state, slot: command.slot }
    case 'set-float':
      return { ...state, float: command.float, panel: 'floating' }
    case 'start': {
      const task = taskById(command.taskId)
      if (!task) return state
      const base: GuideState = {
        ...state,
        taskId: task.id,
        stepIndex: 0,
        taskActions: [],
        stepActions: [],
        notice: null,
        panel: 'docked',
        bindings: {},
      }
      if (task.requiresSample && !command.env.sampleLoaded) return { ...base, view: 'need-sound' }
      return routeAfterSample(base, command.env)
    }
    case 'sample-arrived':
      if (state.view !== 'need-sound') return state
      if (!command.env.sampleLoaded) return state
      return routeAfterSample(state, command.env)
    case 'confirm-mode':
    case 'stay-mode':
      if (state.view !== 'mode-ask') return state
      return enterTask(state)
    case 'ask-focus':
      if (state.view !== 'task') return state
      return { ...state, view: 'focus-ask' }
    case 'cancel-focus':
      if (state.view !== 'focus-ask') return state
      return { ...state, view: 'task' }
    case 'actions': {
      if (state.view !== 'task' || !command.actions.length) return state
      return {
        ...state,
        taskActions: latch(state.taskActions, command.actions),
        stepActions: latch(state.stepActions, command.actions),
      }
    }
    case 'bind': {
      const next = { ...state.bindings, ...command.bindings }
      const same = (Object.keys(next) as GuideModule[]).every((key) => next[key] === state.bindings[key])
      return same ? state : { ...state, bindings: next }
    }
    case 'next': {
      const task = taskById(state.taskId)
      const step = currentStep(state)
      if (!task || !step || state.view !== 'task') return state
      const mode = command.mode ?? 'simple'
      if (!canAdvance(shown(step, mode), state, command.signal)) return state
      const visible = visibleSteps(task, mode, command.signal, state)
      const pos = visible.findIndex((item) => item.id === step.id)
      return goToStep(state, task, pos >= 0 ? visible[pos + 1] : visible[0], null)
    }
    case 'back': {
      if (state.view !== 'task' && state.view !== 'done') return state
      const task = taskById(state.taskId)
      if (!task) return state
      const mode = command.mode ?? 'simple'
      const visible = visibleSteps(task, mode, command.signal ?? null, state)
      const current = state.view === 'done' ? visible[visible.length - 1] : task.steps[state.stepIndex]
      const pos = visible.findIndex((item) => item.id === current?.id)
      if (pos <= 0) return state
      return goToStep(state, task, visible[pos - 1], 'back-keeps-edits')
    }
    case 'skip': {
      const task = taskById(state.taskId)
      const step = currentStep(state)
      const mode = command.mode ?? 'simple'
      if (!task || !step || state.view !== 'task' || !shown(step, mode).skippable) return state
      const visible = visibleSteps(task, mode, command.signal, state)
      const pos = visible.findIndex((item) => item.id === step.id)
      return goToStep(state, task, pos >= 0 ? visible[pos + 1] : visible[0], null)
    }
    case 'retarget': {
      if (state.view !== 'task') return state
      const task = taskById(state.taskId)
      if (!task) return state
      const visible = visibleSteps(task, command.mode, command.signal, state)
      const current = task.steps[state.stepIndex]
      if (current && visible.some((item) => item.id === current.id)) return state
      const waiting = visible.find((item) => readiness(shown(item, command.mode), state, command.signal) === 'waiting')
      return goToStep(state, task, waiting ?? visible[visible.length - 1], null)
    }
    case 'restart':
      if (!state.taskId) return state
      return {
        ...state,
        view: 'task',
        stepIndex: 0,
        taskActions: [],
        stepActions: [],
        notice: null,
        bindings: {},
        panel: state.panel === 'minimized' ? 'docked' : state.panel,
      }
    case 'set-auto':
      return { ...state, autoAdvance: command.value }
    case 'set-query':
      return { ...state, learnQuery: command.query }
    case 'open-topic':
      return { ...state, view: 'learn', learnTopicId: command.id, panel: state.panel === 'minimized' ? 'docked' : state.panel }
    default:
      return state
  }
}
