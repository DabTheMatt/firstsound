export const MAX_TRACKS = 6
export const TRACK_MIX_MIN = 0
export const TRACK_MIX_MAX = 150

export type MixTrack = {
  id: string
  name: string
  mix: number
  muted: boolean
  solo: boolean
  start: number
  end: number
  fileName: string | null
}

export function defaultTracks(start = 0, end = 0): MixTrack[] {
  return [createTrack(1, start, end, 'Track 1')]
}

export function createTrack(n: number, start: number, end: number, name?: string): MixTrack {
  return {
    id: `track-${n}`,
    name: name ?? `Track ${n}`,
    mix: 100,
    muted: false,
    solo: false,
    start,
    end,
    fileName: null,
  }
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

export function anySoloActive(tracks: readonly MixTrack[]): boolean {
  return tracks.some((item) => item.solo && !item.muted)
}

export function trackMixGain(track: MixTrack, tracks: readonly MixTrack[]): number {
  if (track.muted) return 0
  if (anySoloActive(tracks) && !track.solo) return 0
  return clampMix(track.mix) / 100
}

export function trackIsAudible(track: MixTrack, tracks: readonly MixTrack[]): boolean {
  return trackMixGain(track, tracks) > 0
}

/** Playhead inside `track` aligned to the lead region's current position. */
export function alignedRegionOffset(
  trackStart: number,
  trackEnd: number,
  leadStart: number,
  leadEnd: number,
  leadPlayhead: number,
): number {
  const leadSpan = Math.max(leadEnd - leadStart, 1e-6)
  const frac = (leadPlayhead - leadStart) / leadSpan
  const span = Math.max(trackEnd - trackStart, 1e-6)
  return trackStart + Math.min(1, Math.max(0, frac)) * span
}

export function selectedTrack(tracks: readonly MixTrack[], id: string | null): MixTrack | null {
  return tracks.find((track) => track.id === id) ?? tracks[0] ?? null
}

export function addTrack(tracks: readonly MixTrack[], start: number, end: number): MixTrack[] {
  if (tracks.length >= MAX_TRACKS) return cloneTracks(tracks)
  const next = cloneTracks(tracks)
  const id = nextTrackId(next)
  next.push({
    id,
    name: nextTrackName(next),
    mix: 100,
    muted: false,
    solo: false,
    start,
    end,
    fileName: null,
  })
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
  copy.solo = false
  next.push(copy)
  return next
}

export function removeTrack(tracks: readonly MixTrack[], id: string): MixTrack[] {
  if (tracks.length <= 1) return cloneTracks(tracks)
  const next = tracks.filter((track) => track.id !== id).map(cloneTrack)
  return next.length ? next : defaultTracks()
}

export function patchTrack(
  tracks: readonly MixTrack[],
  id: string,
  patch: Partial<Omit<MixTrack, 'id'>>,
): MixTrack[] {
  return tracks.map((track) => {
    if (track.id !== id) return cloneTrack(track)
    const next = cloneTrack(track)
    if (typeof patch.name === 'string' && patch.name.trim()) next.name = patch.name.trim().slice(0, 24)
    if (typeof patch.mix === 'number') next.mix = clampMix(patch.mix)
    if (typeof patch.muted === 'boolean') next.muted = patch.muted
    if (typeof patch.solo === 'boolean') next.solo = patch.solo
    if (typeof patch.start === 'number' && Number.isFinite(patch.start)) next.start = patch.start
    if (typeof patch.end === 'number' && Number.isFinite(patch.end)) next.end = patch.end
    if (patch.fileName === null) next.fileName = null
    else if (typeof patch.fileName === 'string') next.fileName = patch.fileName.slice(0, 80)
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
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_TRACKS) return null
  const parsed: MixTrack[] = []
  const used = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Partial<MixTrack>
    if (typeof rec.id !== 'string' || !rec.id || used.has(rec.id)) return null
    used.add(rec.id)
    parsed.push({
      id: rec.id,
      name: typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim().slice(0, 24) : 'Track',
      mix: clampMix(typeof rec.mix === 'number' ? rec.mix : 100),
      muted: Boolean(rec.muted),
      solo: Boolean(rec.solo),
      start: typeof rec.start === 'number' && Number.isFinite(rec.start) ? rec.start : 0,
      end: typeof rec.end === 'number' && Number.isFinite(rec.end) ? rec.end : 0,
      fileName: typeof rec.fileName === 'string' && rec.fileName.trim() ? rec.fileName.trim().slice(0, 80) : null,
    })
  }
  return parsed.length ? parsed : null
}

/** Tracks that should sound in parallel with the selected (engine) track. */
export function companionTrackIds(tracks: readonly MixTrack[], selectedId: string | null): string[] {
  return tracks
    .filter((track) => track.id !== selectedId && trackMixGain(track, tracks) > 0)
    .map((track) => track.id)
}

export type MixPlaybackPlan = {
  playLead: boolean
  companionIds: string[]
}

/** Who actually sounds: lead engine plus every other unmuted (or soloed) track. */
export function mixPlaybackPlan(tracks: readonly MixTrack[], selectedId: string | null): MixPlaybackPlan {
  const lead = selectedTrack(tracks, selectedId)
  return {
    playLead: Boolean(lead && trackIsAudible(lead, tracks)),
    companionIds: companionTrackIds(tracks, lead?.id ?? selectedId),
  }
}

export function tracksEqual(a: readonly MixTrack[], b: readonly MixTrack[]): boolean {
  if (a.length !== b.length) return false
  return a.every((track, i) => {
    const other = b[i]
    return (
      !!other &&
      track.id === other.id &&
      track.name === other.name &&
      track.mix === other.mix &&
      track.muted === other.muted &&
      track.solo === other.solo &&
      track.start === other.start &&
      track.end === other.end &&
      track.fileName === other.fileName
    )
  })
}
