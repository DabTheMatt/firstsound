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
