import { validatePlayhead, type EditError } from '../../edit/dragFree/edits'
import { mapTime, type TimelineEdit } from '../engine/sampleEdit'
import type { AudioMarker, MarkerDocument, MarkerSource } from './types'

export type { AudioMarker, MarkerDocument, MarkerSource } from './types'

export type MarkerTimeError = EditError | 'name'

export type MarkerWrite =
  | { ok: true; markers: AudioMarker[]; id: string }
  | { ok: false; error: MarkerTimeError }

const NAME_MAX = 80
const DESCRIPTION_MAX = 280

let markerSeq = 0

export function createMarkerId(): string {
  markerSeq += 1
  const nonce =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${markerSeq}`
  return `mk-${markerSeq}-${nonce}`
}

export function cloneMarker(marker: AudioMarker): AudioMarker {
  const copy: AudioMarker = {
    id: marker.id,
    timeSeconds: marker.timeSeconds,
    name: marker.name,
  }
  if (marker.description) copy.description = marker.description
  return copy
}

export function cloneMarkers(markers: readonly AudioMarker[]): AudioMarker[] {
  return markers.map(cloneMarker)
}

export function cloneMarkerSource(source: MarkerSource | null): MarkerSource | null {
  return source ? { ...source } : null
}

/** Time first. Equal times keep the earlier list position. */
export function sortMarkers(markers: readonly AudioMarker[]): AudioMarker[] {
  return markers
    .map((marker, index) => ({ marker, index }))
    .sort((a, b) => a.marker.timeSeconds - b.marker.timeSeconds || a.index - b.index)
    .map((item) => item.marker)
}

export function markersEqual(a: readonly AudioMarker[] | undefined, b: readonly AudioMarker[] | undefined): boolean {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const one = left[index]
    const two = right[index]
    if (!one || !two) return false
    if (one.id !== two.id || one.timeSeconds !== two.timeSeconds || one.name !== two.name) return false
    if ((one.description ?? '') !== (two.description ?? '')) return false
  }
  return true
}

export function markerSourcesEqual(a: MarkerSource | null | undefined, b: MarkerSource | null | undefined): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.id === b.id && a.fileName === b.fileName && a.sampleRate === b.sampleRate && a.duration === b.duration
}

/**
 * Same recording identity, or the same file name, rate, and duration.
 * A different file does not match, even when the display name is empty.
 */
export function markerSourcesCompatible(saved: MarkerSource, current: MarkerSource): boolean {
  if (saved.id === current.id) return true
  if (!saved.fileName || !current.fileName) return false
  if (saved.fileName !== current.fileName) return false
  if (saved.sampleRate !== current.sampleRate) return false
  return Math.abs(saved.duration - current.duration) <= 0.001
}

export function nextMarkerName(markers: readonly AudioMarker[], label: (index: number) => string): string {
  const taken = new Set(markers.map((marker) => marker.name))
  for (let index = 1; index < 10000; index += 1) {
    const name = label(index)
    if (!taken.has(name)) return name
  }
  return label(markers.length + 1)
}

function cleanName(raw: string): string | null {
  const name = raw.trim().slice(0, NAME_MAX)
  return name ? name : null
}

function cleanDescription(raw: string | undefined): string | undefined {
  if (raw == null) return undefined
  const text = raw.trim().slice(0, DESCRIPTION_MAX)
  return text ? text : undefined
}

export function appendMarker(
  markers: readonly AudioMarker[],
  input: { id?: string; timeSeconds: number; name: string; description?: string },
  duration: number,
): MarkerWrite {
  const name = cleanName(input.name)
  if (!name) return { ok: false, error: 'name' }
  const time = validatePlayhead(input.timeSeconds, duration)
  if (!time.ok) return { ok: false, error: time.error }
  const marker: AudioMarker = {
    id: input.id && input.id.trim() ? input.id.trim() : createMarkerId(),
    timeSeconds: time.value,
    name,
  }
  const description = cleanDescription(input.description)
  if (description) marker.description = description
  return { ok: true, id: marker.id, markers: sortMarkers([...markers.map(cloneMarker), marker]) }
}

export function editMarker(
  markers: readonly AudioMarker[],
  id: string,
  patch: { timeSeconds?: number; name?: string; description?: string },
  duration: number,
): MarkerWrite {
  const index = markers.findIndex((marker) => marker.id === id)
  const current = index >= 0 ? markers[index] : undefined
  if (!current) return { ok: false, error: 'missing' }
  const name = patch.name == null ? current.name : cleanName(patch.name)
  if (!name) return { ok: false, error: 'name' }
  let timeSeconds = current.timeSeconds
  if (patch.timeSeconds != null) {
    const time = validatePlayhead(patch.timeSeconds, duration)
    if (!time.ok) return { ok: false, error: time.error }
    timeSeconds = time.value
  }
  const next: AudioMarker = { id: current.id, timeSeconds, name }
  if (patch.description !== undefined) {
    const description = cleanDescription(patch.description)
    if (description) next.description = description
  } else if (current.description) {
    next.description = current.description
  }
  const copy = markers.map(cloneMarker)
  copy[index] = next
  return { ok: true, id, markers: sortMarkers(copy) }
}

export function removeMarker(markers: readonly AudioMarker[], id: string): AudioMarker[] | null {
  if (!markers.some((marker) => marker.id === id)) return null
  return markers.filter((marker) => marker.id !== id).map(cloneMarker)
}

/**
 * Next or previous user marker. Does not wrap.
 * Standing on the selected marker walks the sorted list, so equal times stay reachable.
 */
export function neighborMarker(
  markers: readonly AudioMarker[],
  time: number,
  direction: -1 | 1,
  selectedId: string | null = null,
): AudioMarker | null {
  if (markers.length === 0) return null
  const epsilon = 0.0005
  const selectedIndex = selectedId ? markers.findIndex((marker) => marker.id === selectedId) : -1
  const selected = selectedIndex >= 0 ? markers[selectedIndex] : undefined
  if (selected && Math.abs(selected.timeSeconds - time) <= epsilon) {
    return markers[selectedIndex + direction] ?? null
  }
  if (direction > 0) return markers.find((marker) => marker.timeSeconds > time + epsilon) ?? null
  for (let index = markers.length - 1; index >= 0; index -= 1) {
    const marker = markers[index]
    if (marker && marker.timeSeconds < time - epsilon) return marker
  }
  return null
}

/** Keep each marker on the same audio. A time inside a deleted span is dropped, not moved elsewhere. */
export function remapUserMarkers(markers: readonly AudioMarker[], edit: TimelineEdit): AudioMarker[] {
  const next: AudioMarker[] = []
  for (const marker of markers) {
    const time = mapTime(marker.timeSeconds, edit)
    if (time == null || !Number.isFinite(time)) continue
    next.push({ ...cloneMarker(marker), timeSeconds: time })
  }
  return sortMarkers(next)
}

function parseSource(raw: unknown): MarkerSource | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Partial<MarkerSource>
  if (typeof source.id !== 'string' || !source.id.trim()) return null
  if (typeof source.fileName !== 'string') return null
  if (typeof source.sampleRate !== 'number' || !Number.isFinite(source.sampleRate) || source.sampleRate <= 0) return null
  if (typeof source.duration !== 'number' || !Number.isFinite(source.duration) || source.duration < 0) return null
  return {
    id: source.id.trim(),
    fileName: source.fileName,
    sampleRate: source.sampleRate,
    duration: source.duration,
  }
}

function parseMarker(raw: unknown, duration: number): AudioMarker | null {
  if (!raw || typeof raw !== 'object') return null
  const marker = raw as Partial<AudioMarker>
  if (typeof marker.id !== 'string' || !marker.id.trim()) return null
  if (typeof marker.name !== 'string') return null
  const name = cleanName(marker.name)
  if (!name) return null
  if (typeof marker.timeSeconds !== 'number' || !Number.isFinite(marker.timeSeconds)) return null
  if (marker.timeSeconds < -0.0005 || marker.timeSeconds > duration + 0.0005) return null
  const time = Math.min(duration, Math.max(0, marker.timeSeconds))
  const parsed: AudioMarker = { id: marker.id.trim(), timeSeconds: time, name }
  if (typeof marker.description === 'string') {
    const description = cleanDescription(marker.description)
    if (description) parsed.description = description
  }
  return parsed
}

/** Drop malformed entries. A document without a real source is ignored. */
export function parseMarkerDocument(raw: unknown): MarkerDocument | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as { source?: unknown; markers?: unknown }
  const source = parseSource(body.source)
  if (!source || !Array.isArray(body.markers)) return null
  const seen = new Set<string>()
  const markers: AudioMarker[] = []
  for (const item of body.markers) {
    const marker = parseMarker(item, source.duration)
    if (!marker || seen.has(marker.id)) continue
    seen.add(marker.id)
    markers.push(marker)
  }
  return { source, markers: sortMarkers(markers) }
}
