/**
 * A Show action asks the waveform to frame a span.
 * It does not edit audio or the playback region.
 */

import { engine } from '../hooks/useEngine'
import type { HearingBandId } from './bands'

export type HearingReveal = {
  id: string
  start: number
  end: number
  label: string
  bands: HearingBandId[]
  /** `line` marks one time and leaves the waveform zoom alone. `span` frames a region. */
  mark: 'line' | 'span'
  token: number
}

let reveal: HearingReveal | null = null
let token = 0
const listeners = new Set<() => void>()

export function getHearingReveal(): HearingReveal | null {
  return reveal
}

export function revealHearingSpan(next: Omit<HearingReveal, 'token' | 'mark'> & { mark?: HearingReveal['mark'] }): HearingReveal {
  token += 1
  reveal = { ...next, mark: next.mark ?? 'span', token }
  for (const listener of listeners) listener()
  return reveal
}

/** Mark a transient with a line and move the playhead. Does not zoom or edit audio. */
export function showTransientOnWave(time: number): void {
  revealHearingSpan({
    id: `transient-${time.toFixed(4)}`,
    start: time,
    end: time,
    label: 'TRANSIENT',
    bands: [],
    mark: 'line',
  })
  engine.seekSeconds(time, 'sample')
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

export type WaveZoomCommand = 'fit' | 'in' | 'out'

let waveZoom: ((command: WaveZoomCommand) => void) | null = null

/** Ask the waveform to fit or step its zoom. Hearing focus uses this so the short wave stays reachable. */
export function requestWaveZoom(command: WaveZoomCommand): void {
  waveZoom?.(command)
}

export function bindWaveZoom(fn: (command: WaveZoomCommand) => void): () => void {
  waveZoom = fn
  return () => {
    if (waveZoom === fn) waveZoom = null
  }
}
