/** Digital level helpers. 0 dBFS is a full-scale sample of ±1. */

export const SILENCE_PEAK = 1e-8
export const DB_FLOOR = -120
/** Samples at or above this amplitude are treated as digital clipping. */
export const CLIP_AMPLITUDE = 0.999
/** -0.1 dBFS. Loud material below this is not clipping. */
export const CLIP_DBFS = -0.1

export function amplitudeToDbfs(amplitude: number): number | null {
  if (!(amplitude > 0) || !Number.isFinite(amplitude)) return null
  return 20 * Math.log10(amplitude)
}

export function dbfsToPower(db: number): number {
  if (!Number.isFinite(db)) return 0
  return 10 ** (db / 10)
}

export function powerToDbfs(power: number): number | null {
  if (!(power > 0) || !Number.isFinite(power)) return null
  return 10 * Math.log10(power)
}

export function formatDb(db: number | null, digits = 1): string {
  if (db === null || !Number.isFinite(db)) return '—'
  const rounded = Number(db.toFixed(digits))
  const text = rounded.toFixed(digits)
  return `${rounded > 0 ? '+' : ''}${text} dBFS`.replace('+-', '-')
}

export function formatDbDelta(db: number | null, digits = 1): string {
  if (db === null || !Number.isFinite(db)) return '—'
  const text = db.toFixed(digits)
  return `${db > 0 ? '+' : ''}${text} dB`
}

export function formatHz(hz: number | null): string {
  if (hz === null || !Number.isFinite(hz) || hz <= 0) return '—'
  if (hz >= 1000) {
    const digits = hz >= 10000 ? 1 : 2
    return `${(hz / 1000).toFixed(digits)} kHz`
  }
  return `${Math.round(hz)} Hz`
}

export function formatSignedPct(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  const text = Math.abs(value).toFixed(digits)
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${text}%`
}
