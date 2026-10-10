export type GuideUiEvent = 'export.opened' | 'export.completed' | 'compare.used' | 'waveform.touched'

type Listener = (event: GuideUiEvent) => void

const listeners = new Set<Listener>()

export function emitGuideEvent(event: GuideUiEvent): void {
  for (const listener of listeners) listener(event)
}

export function subscribeGuideEvents(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
