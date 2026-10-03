/**
 * Project tracks. Audio buffers live beside this model (keyed by id).
 * Reordering moves these objects; it does not copy state between ids.
 *
 * Each track owns its insert chain. The strip in `trackMixer.ts` is:
 *   source → fxInsert → track effect chain → mid/side (stereo) → pan
 *   → level → mute/solo gate → master sum → master output gain → safety limiter.
 * `mix` is the only track volume. Mute and solo are a separate gate after the
 * inserts, so a mute silences effect output without deleting the chain.
 * The chain Input module (pan / balance / mono / phase) is track FX, not the
 * mixer pan. The safety limiter and master output gain stay global.
 */

import type { PlaybackDirection } from '../parameters/types'
import { clampMsDb, clampPan } from './mixerParams'

export const MAX_TRACKS = 4
export const TRACK_MIX_MIN = 0
export const TRACK_MIX_MAX = 150

/**
 * Strongly separated families. Defaults for the four slots are amber, cyan,
 * green, violet so lanes read apart without labels.
 */
export const TRACK_COLOR_IDS = [
  'amber',
  'cyan',
  'green',
  'violet',
  'orange',
  'magenta',
  'blue',
  'neutral',
] as const
export type TrackColorId = (typeof TRACK_COLOR_IDS)[number]
export type StereoDisplay = 'combined' | 'split'

const LEGACY_TRACK_COLORS: Record<string, TrackColorId> = {
  accent: 'amber',
  secondary: 'orange',
  warm: 'magenta',
  cool: 'cyan',
  eq: 'green',
  spectrum: 'neutral',
}

export type MixTrack = {
  id: string
  name: string
  /** Set when the user renames the track. File replacement keeps that name. */
  nameLocked: boolean
  color: TrackColorId
  /** 100 = unity (0 dB). The only track volume. Not a second fader. */
  mix: number
  muted: boolean
  solo: boolean
  /** -100 left, 0 center, +100 right. Not the project Gain-module pan. */
  pan: number
  /** Mid component in dB. 0 dB with sideDb 0 reconstructs the stereo source. */
  midDb: number
  /** Side component in dB. Lower narrows the image; the floor is mid-only. */
  sideDb: number
  start: number
  end: number
  fileName: string | null
  channelCount: number
  stereoDisplay: StereoDisplay
  /** Repeats `loopStart`–`loopEnd` until the shared project ends. Does not lengthen it. */
  loop: boolean
  /** Source seconds. With `loopEnd` <= `loopStart`, the loop is the whole source. */
  loopStart: number
  /** Source seconds. Not the destructive waveform selection (`start`/`end`). */
  loopEnd: number
  /** Source direction. Independent of every other track. */
  direction: PlaybackDirection
}

export function isTrackColorId(value: unknown): value is TrackColorId {
  return typeof value === 'string' && (TRACK_COLOR_IDS as readonly string[]).includes(value)
}

export function coerceTrackColor(value: unknown, index: number): TrackColorId {
  if (isTrackColorId(value)) return value
  if (typeof value === 'string' && LEGACY_TRACK_COLORS[value]) return LEGACY_TRACK_COLORS[value]
  return trackColorForIndex(index)
}

export function trackColorForIndex(index: number): TrackColorId {
  const n = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0
  return TRACK_COLOR_IDS[n % TRACK_COLOR_IDS.length]!
}

/** Theme token. Canvas code resolves the variable; the lane must not bake a hex. */
export function trackColorVar(id: TrackColorId): string {
  switch (id) {
    case 'amber':
      return 'var(--track-amber)'
    case 'orange':
      return 'var(--track-orange)'
    case 'magenta':
      return 'var(--track-magenta)'
    case 'violet':
      return 'var(--track-violet)'
    case 'blue':
      return 'var(--track-blue)'
    case 'cyan':
      return 'var(--track-cyan)'
    case 'green':
      return 'var(--track-green)'
    case 'neutral':
      return 'var(--track-neutral)'
  }
}

export function sourceTrackName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '').trim()
  return (base || 'Track').slice(0, 24)
}

export function trackNameAfterLoad(track: MixTrack, fileName: string): { name: string; nameLocked: boolean } {
  if (track.nameLocked) return { name: track.name, nameLocked: true }
  return { name: sourceTrackName(fileName), nameLocked: false }
}

export function mixToDbLabel(mix: number): string {
  if (!(mix > 0)) return '-inf'
  const db = 20 * Math.log10(mix / 100)
  const rounded = Math.round(db * 10) / 10
  if (Math.abs(rounded) < 0.05) return '0 dB'
  const text = rounded.toFixed(1)
  return `${rounded > 0 ? '+' : ''}${text} dB`
}

export function createTrack(n: number, start = 0, end = 0, name?: string): MixTrack {
  return {
    id: `track-${n}`,
    name: name ?? `Track ${n}`,
    nameLocked: false,
    color: trackColorForIndex(n - 1),
    mix: 100,
    muted: false,
    solo: false,
    pan: 0,
    midDb: 0,
    sideDb: 0,
    start,
    end,
    fileName: null,
    channelCount: 0,
    stereoDisplay: 'combined',
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    direction: 'forward',
  }
}

export function createTrackList(count: number, start = 0, end = 0): MixTrack[] {
  const n = Math.max(0, Math.min(MAX_TRACKS, Math.floor(count)))
  return Array.from({ length: n }, (_, i) => createTrack(i + 1, start, end))
}

export function defaultTracks(start = 0, end = 0): MixTrack[] {
  return createTrackList(MAX_TRACKS, start, end)
}

export function cloneTrack(track: MixTrack): MixTrack {
  return { ...track }
}

export function cloneTracks(tracks: readonly MixTrack[]): MixTrack[] {
  return tracks.map(cloneTrack)
}

export function clampMix(value: number): number {
  if (!Number.isFinite(value)) return 100
  return Math.min(TRACK_MIX_MAX, Math.max(TRACK_MIX_MIN, value))
}

export function outputMixGain(mix: number): number {
  return clampMix(mix) / 100
}

/** Linear track level. 1 is 0 dB. Independent of mute and solo. */
export function trackLevelGain(mix: number): number {
  return clampMix(mix) / 100
}

/** True when any strip is soloed, including a solo that is also muted. */
export function anyTrackSoloed(tracks: readonly MixTrack[]): boolean {
  return tracks.some((track) => track.solo)
}

/**
 * Central audibility. A soloed track can still be muted.
 * trackIsAudible = !muted && (nobody soloed || this track is soloed).
 */
export function trackAudible(track: MixTrack, tracks: readonly MixTrack[]): boolean {
  if (track.muted) return false
  return !anyTrackSoloed(tracks) || track.solo
}

export function nextTrackId(tracks: readonly MixTrack[]): string {
  const used = new Set(tracks.map((track) => track.id))
  let n = 1
  while (used.has(`track-${n}`) || used.has(`layer-${n}`)) n++
  return `track-${n}`
}

export function nextTrackName(tracks: readonly MixTrack[], base = 'Track'): string {
  const used = new Set(tracks.map((track) => track.name))
  if (base === 'Track') {
    let n = 1
    while (used.has(`Track ${n}`)) n++
    return `Track ${n}`
  }
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

/** Combined linear gain: level, then the mute/solo gate. */
export function trackMixGain(track: MixTrack, tracks: readonly MixTrack[]): number {
  if (!trackAudible(track, tracks)) return 0
  return trackLevelGain(track.mix)
}

/** Fader for the engine lead voice (the selected strip), including mute/solo. */
export function leadVoiceMixGain(tracks: readonly MixTrack[], selectedId: string | null): number {
  const track = selectedTrack(tracks, selectedId)
  return track ? trackMixGain(track, tracks) : 1
}

export function selectedTrack(tracks: readonly MixTrack[], id: string | null): MixTrack | null {
  return tracks.find((track) => track.id === id) ?? tracks[0] ?? null
}

export function trackHasAudio(track: MixTrack): boolean {
  return track.channelCount > 0 || Boolean(track.fileName)
}

/** Pad or trim to the slot count. Ids already in the list are kept. */
export function ensureTrackSlots(tracks: readonly MixTrack[], start = 0, end = 0): MixTrack[] {
  const next = tracks.slice(0, MAX_TRACKS).map(cloneTrack)
  const used = new Set(next.map((track) => track.id))
  let n = 1
  while (next.length < MAX_TRACKS) {
    while (used.has(`track-${n}`) || used.has(`layer-${n}`)) n++
    const id = `track-${n}`
    used.add(id)
    n++
    const slot = createTrack(next.length + 1, start, end)
    slot.id = id
    slot.color = trackColorForIndex(next.length)
    next.push(slot)
  }
  return next
}

export function addTrack(tracks: readonly MixTrack[], start: number, end: number): MixTrack[] {
  if (tracks.length >= MAX_TRACKS) return cloneTracks(tracks)
  const next = cloneTracks(tracks)
  const id = nextTrackId(next)
  const slot = createTrack(next.length + 1, start, end)
  slot.id = id
  slot.name = nextTrackName(next)
  slot.color = trackColorForIndex(next.length)
  next.push(slot)
  return next
}

export function duplicateTrack(tracks: readonly MixTrack[], id: string): MixTrack[] {
  if (tracks.length >= MAX_TRACKS) return cloneTracks(tracks)
  const source = tracks.find((track) => track.id === id)
  if (!source) return cloneTracks(tracks)
  const next = cloneTracks(tracks)
  const copy = cloneTrack(source)
  copy.id = nextTrackId(next)
  copy.name = nextTrackName(next, source.name)
  copy.nameLocked = false
  copy.solo = false
  next.push(copy)
  return next
}

/** Empty the slot in place. Neighbours keep their index and id. */
export function clearTrackAudio(tracks: readonly MixTrack[], id: string): MixTrack[] {
  return tracks.map((track, index) => {
    if (track.id !== id) return cloneTrack(track)
    const next = cloneTrack(track)
    next.fileName = null
    next.channelCount = 0
    next.stereoDisplay = 'combined'
    next.start = 0
    next.end = 0
    next.mix = 100
    next.pan = 0
    next.midDb = 0
    next.sideDb = 0
    next.muted = false
    next.solo = false
    next.loop = false
    next.loopStart = 0
    next.loopEnd = 0
    next.direction = 'forward'
    if (!next.nameLocked) next.name = `Track ${index + 1}`
    return next
  })
}

export function removeTrack(tracks: readonly MixTrack[], id: string): MixTrack[] {
  return clearTrackAudio(tracks, id)
}

export function moveTrack(tracks: readonly MixTrack[], from: number, to: number): MixTrack[] {
  if (from === to || from < 0 || to < 0 || from >= tracks.length || to >= tracks.length) {
    return cloneTracks(tracks)
  }
  const next = cloneTracks(tracks)
  const [item] = next.splice(from, 1)
  if (!item) return cloneTracks(tracks)
  next.splice(to, 0, item)
  return next
}

export function patchTrack(
  tracks: readonly MixTrack[],
  id: string,
  patch: Partial<Omit<MixTrack, 'id'>>,
): MixTrack[] {
  return tracks.map((track) => {
    if (track.id !== id) return cloneTrack(track)
    const next = cloneTrack(track)
    if (typeof patch.name === 'string' && patch.name.trim()) {
      next.name = patch.name.trim().slice(0, 24)
      next.nameLocked = patch.nameLocked !== false
    }
    if (patch.nameLocked === true) next.nameLocked = true
    if (patch.nameLocked === false) next.nameLocked = false
    if (isTrackColorId(patch.color)) next.color = patch.color
    if (typeof patch.mix === 'number') next.mix = clampMix(patch.mix)
    if (typeof patch.muted === 'boolean') next.muted = patch.muted
    if (typeof patch.solo === 'boolean') next.solo = patch.solo
    if (typeof patch.pan === 'number') next.pan = clampPan(patch.pan)
    if (typeof patch.midDb === 'number') next.midDb = clampMsDb(patch.midDb)
    if (typeof patch.sideDb === 'number') next.sideDb = clampMsDb(patch.sideDb)
    if (typeof patch.start === 'number' && Number.isFinite(patch.start)) next.start = patch.start
    if (typeof patch.end === 'number' && Number.isFinite(patch.end)) next.end = patch.end
    if (patch.fileName === null) next.fileName = null
    else if (typeof patch.fileName === 'string') next.fileName = patch.fileName.slice(0, 80)
    if (typeof patch.channelCount === 'number' && Number.isFinite(patch.channelCount)) {
      next.channelCount = Math.max(0, Math.min(8, Math.round(patch.channelCount)))
    }
    if (patch.stereoDisplay === 'combined' || patch.stereoDisplay === 'split') {
      next.stereoDisplay = patch.stereoDisplay
    }
    if (typeof patch.loop === 'boolean') next.loop = patch.loop
    if (typeof patch.loopStart === 'number' && Number.isFinite(patch.loopStart)) next.loopStart = Math.max(0, patch.loopStart)
    if (typeof patch.loopEnd === 'number' && Number.isFinite(patch.loopEnd)) next.loopEnd = Math.max(0, patch.loopEnd)
    if (next.loopEnd > 0 && next.loopEnd < next.loopStart) {
      const swap = next.loopStart
      next.loopStart = next.loopEnd
      next.loopEnd = swap
    }
    if (patch.direction === 'forward' || patch.direction === 'reverse' || patch.direction === 'pingpong') {
      next.direction = patch.direction
    }
    return next
  })
}

export function writeTrackRegion(
  tracks: readonly MixTrack[],
  id: string,
  start: number,
  end: number,
): MixTrack[] {
  return patchTrack(tracks, id, { start, end })
}

/** Accept current tracks JSON or legacy mix-layer snapshots (insert/eq ignored). */
export function parseTracks(raw: unknown): MixTrack[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 16) return null
  const parsed: MixTrack[] = []
  const used = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Partial<MixTrack>
    if (typeof rec.id !== 'string' || !rec.id || used.has(rec.id)) return null
    used.add(rec.id)
    const fileName = typeof rec.fileName === 'string' && rec.fileName.trim() ? rec.fileName.trim().slice(0, 80) : null
    const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim().slice(0, 24) : 'Track'
    const derived = fileName ? sourceTrackName(fileName) : ''
    const nameLocked =
      typeof rec.nameLocked === 'boolean'
        ? rec.nameLocked
        : Boolean(name && derived && name !== derived && !/^Track \d+$/.test(name))
    parsed.push({
      id: rec.id,
      name,
      nameLocked,
      color: coerceTrackColor(rec.color, parsed.length),
      mix: clampMix(typeof rec.mix === 'number' ? rec.mix : 100),
      muted: Boolean(rec.muted),
      solo: Boolean(rec.solo),
      pan: clampPan(typeof rec.pan === 'number' ? rec.pan : 0),
      midDb: clampMsDb(typeof rec.midDb === 'number' ? rec.midDb : 0),
      sideDb: clampMsDb(typeof rec.sideDb === 'number' ? rec.sideDb : 0),
      start: typeof rec.start === 'number' && Number.isFinite(rec.start) ? rec.start : 0,
      end: typeof rec.end === 'number' && Number.isFinite(rec.end) ? rec.end : 0,
      fileName,
      channelCount:
        typeof rec.channelCount === 'number' && rec.channelCount > 0
          ? Math.min(8, Math.round(rec.channelCount))
          : 0,
      stereoDisplay: rec.stereoDisplay === 'split' ? 'split' : 'combined',
      loop: rec.loop === true,
      loopStart: typeof rec.loopStart === 'number' && Number.isFinite(rec.loopStart) ? Math.max(0, rec.loopStart) : 0,
      loopEnd: typeof rec.loopEnd === 'number' && Number.isFinite(rec.loopEnd) ? Math.max(0, rec.loopEnd) : 0,
      direction: rec.direction === 'reverse' || rec.direction === 'pingpong' ? rec.direction : 'forward',
    })
  }
  return parsed.length ? parsed : null
}

/**
 * Audible companions. Playback still runs muted and unsoloed sources;
 * this list is the mix, not a reason to stop a buffer.
 */
export function companionTrackIds(tracks: readonly MixTrack[], selectedId: string | null): string[] {
  return tracks
    .filter((track) => track.id !== selectedId && trackMixGain(track, tracks) > 0)
    .map((track) => track.id)
}

export function tracksEqual(a: readonly MixTrack[], b: readonly MixTrack[]): boolean {
  if (a.length !== b.length) return false
  return a.every((track, i) => {
    const other = b[i]
    return (
      !!other &&
      track.id === other.id &&
      track.name === other.name &&
      track.nameLocked === other.nameLocked &&
      track.color === other.color &&
      track.mix === other.mix &&
      track.muted === other.muted &&
      track.solo === other.solo &&
      track.pan === other.pan &&
      track.midDb === other.midDb &&
      track.sideDb === other.sideDb &&
      track.start === other.start &&
      track.end === other.end &&
      track.fileName === other.fileName &&
      track.channelCount === other.channelCount &&
      track.stereoDisplay === other.stereoDisplay &&
      track.loop === other.loop &&
      track.loopStart === other.loopStart &&
      track.loopEnd === other.loopEnd &&
      track.direction === other.direction
    )
  })
}
