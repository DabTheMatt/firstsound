/**
 * A Show action asks the waveform to frame a span.
 * It does not edit audio or the playback region.
 */

import type { HearingBandId } from './bands'

export type HearingReveal = {
  id: string
  start: number
  end: number
  label: string
  bands: HearingBandId[]
  token: number
}

let reveal: HearingReveal | null = null
let token = 0
const listeners = new Set<() => void>()

export function getHearingReveal(): HearingReveal | null {
  return reveal
}

export function revealHearingSpan(next: Omit<HearingReveal, 'token'>): HearingReveal {
  token += 1
  reveal = { ...next, token }
  for (const listener of listeners) listener()
  return reveal
}

export function subscribeHearingReveal(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let mapDemand = false
const mapListeners = new Set<() => void>()

export function hearingMapDemand(): boolean {
  return mapDemand
}

export function setHearingMapDemand(on: boolean): void {
  if (mapDemand === on) return
  mapDemand = on
  for (const listener of mapListeners) listener()
}

export function subscribeHearingMapDemand(listener: () => void): () => void {
  mapListeners.add(listener)
  return () => mapListeners.delete(listener)
}
