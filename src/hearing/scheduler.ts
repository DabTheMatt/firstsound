/**
 * One optional animation clock for Hearing Access.
 * Widgets do not start their own loops. The clock runs only while playback
 * needs a playhead (haptics or a visible sound map).
 */

export type HearingClockDemand = {
  enabled: boolean
  playing: boolean
  soundMapVisible: boolean
  haptics: boolean
}

type Stats = {
  rafActive: boolean
  rafStarts: number
  analyserNodesCreated: number
  ticks: number
}

const stats: Stats = {
  rafActive: false,
  rafStarts: 0,
  analyserNodesCreated: 0,
  ticks: 0,
}

let demand: HearingClockDemand = {
  enabled: false,
  playing: false,
  soundMapVisible: false,
  haptics: false,
}

let raf = 0
const listeners = new Set<(timeMs: number) => void>()

function wantsClock(): boolean {
  return demand.enabled && demand.playing && (demand.soundMapVisible || demand.haptics)
}

function stop(): void {
  if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
  raf = 0
  stats.rafActive = false
}

function tick(timeMs: number): void {
  stats.ticks += 1
  for (const listener of listeners) listener(timeMs)
  if (!wantsClock()) {
    stop()
    return
  }
  raf = requestAnimationFrame(tick)
}

function start(): void {
  if (raf || typeof requestAnimationFrame !== 'function') return
  stats.rafStarts += 1
  stats.rafActive = true
  raf = requestAnimationFrame(tick)
}

export function setHearingClockDemand(next: HearingClockDemand): void {
  demand = next
  if (wantsClock()) start()
  else stop()
}

export function subscribeHearingClock(listener: (timeMs: number) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function hearingRuntimeStats(): Stats {
  return { ...stats, rafActive: raf !== 0 }
}

/** Hearing Access does not construct AnalyserNodes. This counter stays at zero. */
export function noteAnalyserNodeCreated(): void {
  stats.analyserNodesCreated += 1
}
