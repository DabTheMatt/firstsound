/**
 * Stable identities for the per-track mixer.
 *
 * Automation, LFO, and Random can target these ids later. The id is
 * `track:<trackId>:<key>`. Display order is not part of the id, so reordering
 * lanes does not retarget a lane that was aimed at a track.
 *
 * The stored values live on the track (`mix`, `pan`, `midDb`, `sideDb`,
 * `muted`, `solo`). This module does not keep a second copy.
 */

export const TRACK_MIXER_PARAM_KEYS = ['volume', 'pan', 'midGain', 'sideGain', 'mute', 'solo'] as const
export type TrackMixerParamKey = (typeof TRACK_MIXER_PARAM_KEYS)[number]

export type TrackMixerParamDef = {
  key: TrackMixerParamKey
  min: number
  max: number
  defaultValue: number
  unit: string
}

/**
 * Volume uses the existing mix fader: 0 is the mute floor, 100 is 0 dB,
 * 150 is the limited positive gain the project already allowed (~+3.5 dB).
 * Mid and Side follow the effect-chain Mid/Side gain range.
 */
export const TRACK_MIXER_PARAMS: Record<TrackMixerParamKey, TrackMixerParamDef> = {
  volume: { key: 'volume', min: 0, max: 150, defaultValue: 100, unit: '%' },
  pan: { key: 'pan', min: -100, max: 100, defaultValue: 0, unit: '%' },
  midGain: { key: 'midGain', min: -60, max: 12, defaultValue: 0, unit: 'dB' },
  sideGain: { key: 'sideGain', min: -60, max: 12, defaultValue: 0, unit: 'dB' },
  mute: { key: 'mute', min: 0, max: 1, defaultValue: 0, unit: '' },
  solo: { key: 'solo', min: 0, max: 1, defaultValue: 0, unit: '' },
}

const KEY_SET = new Set<string>(TRACK_MIXER_PARAM_KEYS)

export function isTrackMixerParamKey(value: string): value is TrackMixerParamKey {
  return KEY_SET.has(value)
}

export function trackMixerParamId(trackId: string, key: TrackMixerParamKey): string {
  return `track:${trackId}:${key}`
}

export function parseTrackMixerParamId(id: string): { trackId: string; key: TrackMixerParamKey } | null {
  const parts = id.split(':')
  if (parts.length < 3 || parts[0] !== 'track') return null
  const key = parts[parts.length - 1] ?? ''
  if (!isTrackMixerParamKey(key)) return null
  const trackId = parts.slice(1, -1).join(':')
  if (!trackId) return null
  return { trackId, key }
}

export function clampPan(value: number): number {
  const def = TRACK_MIXER_PARAMS.pan
  if (!Number.isFinite(value)) return def.defaultValue
  return Math.min(def.max, Math.max(def.min, value))
}

export function clampMsDb(value: number): number {
  const def = TRACK_MIXER_PARAMS.midGain
  if (!Number.isFinite(value)) return def.defaultValue
  return Math.min(def.max, Math.max(def.min, value))
}

export type TrackMixerNumbers = {
  mix: number
  pan: number
  midDb: number
  sideDb: number
  muted: boolean
  solo: boolean
}

/** Read the stored mixer value in the units of its parameter definition. */
export function trackMixerParamValue(track: TrackMixerNumbers, key: TrackMixerParamKey): number {
  switch (key) {
    case 'volume':
      return track.mix
    case 'pan':
      return track.pan
    case 'midGain':
      return track.midDb
    case 'sideGain':
      return track.sideDb
    case 'mute':
      return track.muted ? 1 : 0
    case 'solo':
      return track.solo ? 1 : 0
  }
}

export function formatMixerDb(db: number): string {
  if (!Number.isFinite(db) || db <= TRACK_MIXER_PARAMS.midGain.min) return '-inf'
  const rounded = Math.round(db * 10) / 10
  if (Math.abs(rounded) < 0.05) return '0 dB'
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)} dB`
}

/** Center is 0. Left is negative, shown as L. Right is positive, shown as R. */
export function formatPan(pan: number): string {
  const n = clampPan(pan)
  if (Math.abs(n) < 0.5) return '0'
  const side = n < 0 ? 'L' : 'R'
  return `${side} ${Math.abs(Math.round(n))}`
}
