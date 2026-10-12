/** Hover preview for one unsaved suggestion. Not part of the marker document. */

export type MarkerPreview = {
  timeSeconds: number
  name: string
}

let preview: MarkerPreview | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function markerPreview(): MarkerPreview | null {
  return preview
}

export function setMarkerPreview(next: MarkerPreview | null): void {
  if (preview === next) return
  if (preview && next && preview.timeSeconds === next.timeSeconds && preview.name === next.name) return
  preview = next
  emit()
}

export function subscribeMarkerPreview(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetMarkerPreview(): void {
  preview = null
  emit()
}
