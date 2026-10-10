import { projectSatisfies, type GuideSignal } from './actions'
import { taskById } from './tasks'
import type { GuideAction, GuidePanelMode, GuideSlot, GuideStep, GuideTask, GuideView } from './types'

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
  | { type: 'next'; signal: GuideSignal | null }
  | { type: 'back' }
  | { type: 'skip'; signal: GuideSignal | null }
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

function advance(state: GuideState, task: GuideTask): GuideState {
  const nextIndex = state.stepIndex + 1
  if (nextIndex >= task.steps.length) {
    return { ...state, view: 'done', stepIndex: task.steps.length, stepActions: [], notice: null }
  }
  return { ...state, view: 'task', stepIndex: nextIndex, stepActions: [], notice: null }
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
    case 'next': {
      const task = taskById(state.taskId)
      const step = currentStep(state)
      if (!task || !step || state.view !== 'task') return state
      if (!canAdvance(step, state, command.signal)) return state
      return advance(state, task)
    }
    case 'back': {
      if ((state.view !== 'task' && state.view !== 'done') || state.stepIndex <= 0) return state
      const index = state.view === 'done' ? Math.max(0, state.stepIndex - 1) : state.stepIndex - 1
      return {
        ...state,
        view: 'task',
        stepIndex: index,
        stepActions: [],
        notice: 'back-keeps-edits',
      }
    }
    case 'skip': {
      const task = taskById(state.taskId)
      const step = currentStep(state)
      if (!task || !step || state.view !== 'task' || !step.skippable) return state
      return advance(state, task)
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
