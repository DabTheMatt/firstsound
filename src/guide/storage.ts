import type { GuideState } from './session'
import { INITIAL_GUIDE_STATE } from './session'
import type { GuideAction, GuideSlot } from './types'

const SLOTS = new Set<GuideSlot>(['top-left', 'top-right', 'bottom-left', 'bottom-right'])

function readSlot(value: unknown): GuideSlot {
  if (value === 'top') return 'top-left'
  if (value === 'bottom') return 'bottom-left'
  return typeof value === 'string' && SLOTS.has(value as GuideSlot) ? (value as GuideSlot) : 'bottom-left'
}

const STORAGE_KEY = 'field.guidedTasks'

type PersistedGuide = {
  view: GuideState['view']
  panel: GuideState['panel']
  slot: GuideState['slot']
  taskId: string | null
  stepIndex: number
  taskActions: GuideAction[]
  autoAdvance: boolean
}

export function persistGuide(state: GuideState): void {
  if (typeof localStorage === 'undefined') return
  const payload: PersistedGuide = {
    view: state.view === 'need-sound' || state.view === 'mode-ask' || state.view === 'focus-ask' ? 'task' : state.view,
    panel: state.panel,
    slot: state.slot,
    taskId: state.taskId,
    stepIndex: state.stepIndex,
    taskActions: state.taskActions,
    autoAdvance: state.autoAdvance,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
}

export function readPersistedGuide(): GuideState {
  if (typeof localStorage === 'undefined') return INITIAL_GUIDE_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_GUIDE_STATE
    const parsed = JSON.parse(raw) as Partial<PersistedGuide>
    return {
      ...INITIAL_GUIDE_STATE,
      view: parsed.view ?? 'closed',
      panel: parsed.panel ?? 'docked',
      slot: readSlot(parsed.slot),
      taskId: typeof parsed.taskId === 'string' ? parsed.taskId : null,
      stepIndex: typeof parsed.stepIndex === 'number' ? parsed.stepIndex : 0,
      taskActions: Array.isArray(parsed.taskActions) ? parsed.taskActions : [],
      autoAdvance: Boolean(parsed.autoAdvance),
    }
  } catch {
    return INITIAL_GUIDE_STATE
  }
}
