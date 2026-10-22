export type IntroSurface = 'closed' | 'welcome' | 'tour' | 'help' | 'feedback'

export type IntroState = {
  surface: IntroSurface
  step: number
}

const listeners = new Set<() => void>()

let state: IntroState = { surface: 'closed', step: 0 }

function emit(): void {
  for (const listener of listeners) listener()
}

export function getIntroState(): IntroState {
  return state
}

export function subscribeIntro(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function openIntro(surface: Exclude<IntroSurface, 'closed'>, step = 0): void {
  state = { surface, step: Math.max(0, step) }
  emit()
}

export function setIntroStep(step: number): void {
  state = { ...state, step: Math.max(0, step) }
  emit()
}

export function closeIntro(): void {
  if (state.surface === 'closed' && state.step === 0) return
  state = { surface: 'closed', step: 0 }
  emit()
}

export function resetIntroSession(): void {
  state = { surface: 'closed', step: 0 }
  listeners.clear()
}
