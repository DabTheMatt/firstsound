import { moduleIds } from './actions'
import type { GuideSignal } from './actions'
import type { GuideState } from './session'
import type { GuideModule, GuideStep, GuideTask } from './types'

export function presentStep(step: GuideStep, mode: string | null): GuideStep {
  if (mode !== 'technical' || !step.technical) return step
  const face = step.technical
  return {
    ...step,
    target: face.target === undefined ? step.target : face.target,
    title: face.title ?? step.title,
    instruction: face.instruction ?? step.instruction,
    hint: face.hint === undefined ? step.hint : face.hint,
    success: face.success === undefined ? step.success : face.success,
    completion: face.completion ?? step.completion,
  }
}

function modeAllows(step: GuideStep, mode: string | null): boolean {
  if (!step.modes) return true
  if (mode === 'technical') return step.modes === 'technical'
  return step.modes === 'simple'
}

function hiddenBecausePresent(step: GuideStep, signal: GuideSignal | null, state: GuideState): boolean {
  if (!step.skipIfPresent || !step.module || !signal) return false
  if (!moduleIds(signal, step.module).length) return false
  if (step.completion.kind === 'any' && step.completion.actions.some((action) => state.stepActions.includes(action))) {
    return false
  }
  return true
}

export function visibleSteps(
  task: GuideTask,
  mode: string | null,
  signal: GuideSignal | null,
  state: GuideState,
): GuideStep[] {
  return task.steps.filter((step) => modeAllows(step, mode) && !hiddenBecausePresent(step, signal, state))
}

export function visiblePosition(
  task: GuideTask,
  state: GuideState,
  mode: string | null,
  signal: GuideSignal | null,
): { index: number; total: number } {
  const visible = visibleSteps(task, mode, signal, state)
  const current = task.steps[state.stepIndex]
  const index = Math.max(0, visible.findIndex((step) => step.id === current?.id))
  return { index, total: Math.max(1, visible.length) }
}

export function moduleForTarget(target: string | null): GuideModule | null {
  if (!target) return null
  if (target === 'technical.reverb' || target === 'technical.reverbWet' || target === 'effect.reverb') return 'reverb'
  if (target === 'technical.delay' || target === 'technical.delayWet' || target === 'technical.delayTime' || target === 'effect.delay') return 'delay'
  if (target === 'technical.eq' || target === 'effect.eq' || target === 'sound.clarity' || target === 'sound.warmth') return 'eq'
  if (target === 'technical.inputGain' || target === 'input.gain' || target === 'input.speed' || target === 'input.pitch' || target === 'input.reverse') return 'gain'
  return null
}
