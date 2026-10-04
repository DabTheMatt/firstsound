import { hzToNoteName } from '../audio/engine/pitchScale'

export type SpectralTone = {
  hz: number
  note: string
  db: number
}

const DB_FLOOR = -120

function dbfsToPower(db: number): number {
  return 10 ** (db / 10)
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

/**
 * Partial peaks in one spectrum.
 * Sensitivity 0 keeps peaks within about 4 dB of the loudest, at most two notes.
 * Sensitivity 1 reaches about 24 dB down and up to six notes.
 * The same note is listed once. Silence and a floor below −70 dB return nothing.
 */
export function spectralTones(
  bins: Float32Array,
  sampleRate: number,
  fftSize: number,
  sensitivity: number,
): SpectralTone[] {
  if (bins.length < 8 || !(sampleRate > 0) || !(fftSize > 0)) return []
  const sens = clamp01(sensitivity)
  const dropDb = 4 + sens * 20
  const minProminence = 12 - sens * 8
  const maxCount = 1 + Math.round(sens * 5)
  let peakDb = DB_FLOOR
  const peaks: { bin: number; db: number }[] = []
  for (let i = 2; i < bins.length - 2; i++) {
    const db = bins[i] ?? DB_FLOOR
    if (db > peakDb) peakDb = db
    const prev = bins[i - 1] ?? DB_FLOOR
    const next = bins[i + 1] ?? DB_FLOOR
    if (db >= prev && db > next && db >= (bins[i - 2] ?? DB_FLOOR)) peaks.push({ bin: i, db })
  }
  if (!(peakDb > -70)) return []
  const floor = peakDb - dropDb
  const byNote = new Map<string, SpectralTone>()
  for (const peak of peaks) {
    if (peak.db < floor) continue
    const left = bins[Math.max(1, peak.bin - 6)] ?? DB_FLOOR
    const right = bins[Math.min(bins.length - 1, peak.bin + 6)] ?? DB_FLOOR
    if (peak.db - Math.min(left, right) < minProminence) continue
    const prev = dbfsToPower(bins[peak.bin - 1] ?? DB_FLOOR)
    const mid = dbfsToPower(bins[peak.bin] ?? DB_FLOOR)
    const next = dbfsToPower(bins[peak.bin + 1] ?? DB_FLOOR)
    const denom = prev - 2 * mid + next
    let delta = 0
    if (Math.abs(denom) > 1e-18) delta = (0.5 * (prev - next)) / denom
    delta = Math.max(-0.5, Math.min(0.5, delta))
    const hz = ((peak.bin + delta) * sampleRate) / fftSize
    if (!(hz > 20) || hz > sampleRate / 2) continue
    const note = hzToNoteName(hz)
    const tone: SpectralTone = { hz, note, db: peak.db }
    const existing = byNote.get(note)
    if (!existing || tone.db > existing.db) byNote.set(note, tone)
  }
  return [...byNote.values()].sort((a, b) => b.db - a.db).slice(0, maxCount)
}

export type ToneMoment = {
  time: number
  /** Peaks at full sensitivity. The playhead view filters them. */
  tones: SpectralTone[]
  flatness: number | null
  centroidHz: number | null
  crestDb: number | null
}

export type MomentCharacter = {
  id: 'tonal' | 'noise-like' | 'percussive' | 'sustained' | 'bright' | 'dull' | 'harmonic' | 'inharmonic'
  label: string
  detail: string
}

/** Keep the loudest partials for this sensitivity. Stored moments use sensitivity 1. */
export function filterTones(tones: readonly SpectralTone[], sensitivity: number): SpectralTone[] {
  if (tones.length === 0) return []
  const sens = clamp01(sensitivity)
  const drop = 4 + sens * 20
  const maxCount = 1 + Math.round(sens * 5)
  const loudest = tones.reduce((max, tone) => Math.max(max, tone.db), -Infinity)
  return tones.filter((tone) => loudest - tone.db <= drop + 0.05).slice(0, maxCount)
}

export function momentAtTime(moments: readonly ToneMoment[], timeSec: number): ToneMoment | null {
  if (moments.length === 0 || !Number.isFinite(timeSec)) return moments[0] ?? null
  let best = moments[0]
  if (!best) return null
  let bestDist = Math.abs(best.time - timeSec)
  for (let i = 1; i < moments.length; i++) {
    const moment = moments[i]
    if (!moment) continue
    const dist = Math.abs(moment.time - timeSec)
    if (dist < bestDist) {
      best = moment
      bestDist = dist
    }
  }
  return best
}

function harmonicFit(tones: readonly SpectralTone[]): number | null {
  if (tones.length < 2) return null
  const fundamental = tones.reduce((min, tone) => Math.min(min, tone.hz), Infinity)
  if (!(fundamental > 20)) return null
  let hits = 0
  let compared = 0
  for (const tone of tones) {
    if (tone.hz <= fundamental * 1.2) continue
    compared++
    const ratio = tone.hz / fundamental
    const nearest = Math.max(2, Math.round(ratio))
    if (Math.abs(ratio - nearest) / nearest <= 0.03) hits++
  }
  if (compared === 0) return null
  return hits / compared
}

/** Character of one moment. Labels name the measurement, not a taste judgment. */
export function momentCharacters(moment: ToneMoment | null, sensitivity: number): MomentCharacter[] {
  if (!moment) return []
  const tones = filterTones(moment.tones, sensitivity)
  const out: MomentCharacter[] = []
  const flat = moment.flatness
  const crest = moment.crestDb
  const centroid = moment.centroidHz
  if (flat !== null && flat <= 0.18) {
    out.push({
      id: 'tonal',
      label: 'TONAL',
      detail: `Spectral flatness ${flat.toFixed(3)} in this moment. Energy sits in narrow peaks.`,
    })
  } else if (flat !== null && flat >= 0.45) {
    out.push({
      id: 'noise-like',
      label: 'NOISE-LIKE',
      detail: `Spectral flatness ${flat.toFixed(3)} in this moment. Energy is spread across the spectrum.`,
    })
  }
  if (crest !== null && crest >= 14) {
    out.push({
      id: 'percussive',
      label: 'PERCUSSIVE',
      detail: `Crest factor ${crest.toFixed(1)} dB in this moment. The peak is much louder than the average level.`,
    })
  } else if (crest !== null && crest < 7 && flat !== null && flat < 0.28) {
    out.push({
      id: 'sustained',
      label: 'SUSTAINED',
      detail: `Crest factor ${crest.toFixed(1)} dB in this moment. Level stays close to the peak.`,
    })
  }
  if (centroid !== null && centroid >= 4000) {
    out.push({
      id: 'bright',
      label: 'BRIGHT',
      detail: `Spectral centroid ${Math.round(centroid)} Hz in this moment. Energy leans toward the highs.`,
    })
  } else if (centroid !== null && centroid > 0 && centroid <= 350) {
    out.push({
      id: 'dull',
      label: 'DULL',
      detail: `Spectral centroid ${Math.round(centroid)} Hz in this moment. Energy leans toward the lows.`,
    })
  }
  const fit = harmonicFit(tones)
  if (fit !== null && fit >= 0.6) {
    out.push({
      id: 'harmonic',
      label: 'HARMONIC',
      detail: 'Partials in this moment sit near whole-number multiples of the lowest one.',
    })
  } else if (fit !== null && fit <= 0.34) {
    out.push({
      id: 'inharmonic',
      label: 'INHARMONIC',
      detail: 'Partials in this moment do not sit on a whole-number harmonic series.',
    })
  }
  return out
}
