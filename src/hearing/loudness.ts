/** Word scale for the Hearing Access loudness meter. Thresholds are dBFS. */

export type LoudnessZone = 'silent' | 'quiet' | 'medium' | 'loud' | 'very-loud' | 'clipping'

export const LOUDNESS_FLOOR_DB = -60

export const LOUDNESS_ZONE_LABEL: Record<LoudnessZone, string> = {
  silent: 'SILENT',
  quiet: 'QUIET',
  medium: 'MEDIUM',
  loud: 'LOUD',
  'very-loud': 'VERY LOUD',
  clipping: 'CLIPPING',
}

/** Labeled ticks from the floor up to full scale. */
export const LOUDNESS_TICKS = [-60, -40, -24, -12, -6, 0] as const

export function loudnessZone(db: number | null, clipped = false): LoudnessZone {
  if (clipped) return 'clipping'
  if (db === null || !Number.isFinite(db) || db <= LOUDNESS_FLOOR_DB) return 'silent'
  if (db < -40) return 'quiet'
  if (db < -18) return 'medium'
  if (db < -8) return 'loud'
  if (db < -1) return 'very-loud'
  return 'clipping'
}

export function formatLoudnessDb(db: number | null): string {
  if (db === null || !Number.isFinite(db)) return '—'
  const rounded = Math.round(db * 10) / 10
  return `${rounded.toFixed(1)} dBFS`
}

/** Peak and RMS in dBFS from one time-domain buffer. Silence is −Infinity. */
export function levelsFromTimeDomain(samples: ArrayLike<number>): { peakDb: number; rmsDb: number } {
  let peak = 0
  let sum = 0
  const n = samples.length
  for (let i = 0; i < n; i++) {
    const sample = samples[i] ?? 0
    const abs = Math.abs(sample)
    if (abs > peak) peak = abs
    sum += sample * sample
  }
  const rms = n > 0 ? Math.sqrt(sum / n) : 0
  return {
    peakDb: peak > 0 ? 20 * Math.log10(peak) : Number.NEGATIVE_INFINITY,
    rmsDb: rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY,
  }
}
