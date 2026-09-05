/** Onset times (seconds) and a BPM guess from a mono PCM region. */

export const TEMPO_MIN_BPM = 40
export const TEMPO_MAX_BPM = 240

const HOP_SEC = 0.01
const WIN_HOPS = 2
const MIN_ONSET_GAP_SEC = 0.04

export type TempoGuess = {
  bpm: number
  confidence: number
  transients: number[]
}

export function detectTransients(
  samples: Float32Array,
  sampleRate: number,
  offsetSec = 0,
): number[] {
  const flux = spectralFlux(samples, sampleRate)
  if (!flux) return []
  const { values, hopSec } = flux
  const times: number[] = []
  const minGap = Math.max(1, Math.round(MIN_ONSET_GAP_SEC / hopSec))
  const thresh = adaptiveThreshold(values)
  let last = -minGap
  for (let i = 1; i < values.length - 1; i++) {
    const v = values[i] ?? 0
    if (v < thresh) continue
    if (v < (values[i - 1] ?? 0) || v < (values[i + 1] ?? 0)) continue
    if (i - last < minGap) {
      if (v > (values[last] ?? 0)) {
        times[times.length - 1] = offsetSec + i * hopSec
        last = i
      }
      continue
    }
    times.push(offsetSec + i * hopSec)
    last = i
  }
  return times
}

export function estimateTempo(
  samples: Float32Array,
  sampleRate: number,
  offsetSec = 0,
  durationSec?: number,
): TempoGuess | null {
  const transients = detectTransients(samples, sampleRate, offsetSec)
  const flux = spectralFlux(samples, sampleRate)
  const length = durationSec ?? samples.length / Math.max(1, sampleRate)
  const fromAc = flux ? bpmFromAutocorr(flux.values, flux.hopSec, length) : null
  const fromIoi = bpmFromIoIs(transients)
  const picked = pickBpm(fromAc, fromIoi, length)
  if (!picked) return null
  return { bpm: picked.bpm, confidence: picked.confidence, transients }
}

function spectralFlux(
  samples: Float32Array,
  sampleRate: number,
): { values: Float32Array; hopSec: number } | null {
  if (sampleRate <= 0 || samples.length < 32) return null
  const hop = Math.max(1, Math.round(sampleRate * HOP_SEC))
  const win = hop * WIN_HOPS
  if (samples.length < win + hop) return null
  const n = Math.floor((samples.length - win) / hop)
  if (n < 8) return null
  const env = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const start = i * hop
    let sum = 0
    let diff = 0
    let prev = samples[start] ?? 0
    for (let j = 0; j < win; j++) {
      const v = samples[start + j] ?? 0
      sum += v * v
      const d = v - prev
      diff += d * d
      prev = v
    }
    env[i] = Math.sqrt(sum / win) + 1.35 * Math.sqrt(diff / win)
  }
  const values = new Float32Array(n)
  for (let i = 1; i < n; i++) values[i] = Math.max(0, (env[i] ?? 0) - (env[i - 1] ?? 0))
  return { values, hopSec: hop / sampleRate }
}

function adaptiveThreshold(flux: Float32Array): number {
  let sum = 0
  let peak = 0
  for (let i = 0; i < flux.length; i++) {
    const v = flux[i] ?? 0
    sum += v
    if (v > peak) peak = v
  }
  const mean = flux.length ? sum / flux.length : 0
  return Math.max(mean * 1.35, peak * 0.12, 1e-6)
}

function bpmFromAutocorr(
  flux: Float32Array,
  hopSec: number,
  durationSec: number,
): { bpm: number; score: number } | null {
  const minLag = Math.max(2, Math.round(60 / TEMPO_MAX_BPM / hopSec))
  const maxLag = Math.min(flux.length - 2, Math.round(60 / TEMPO_MIN_BPM / hopSec))
  if (maxLag <= minLag) return null
  let bestLag = minLag
  let best = -1
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0
    let norm = 0
    for (let i = 0; i + lag < flux.length; i++) {
      const a = flux[i] ?? 0
      const b = flux[i + lag] ?? 0
      acc += a * b
      norm += a * a
    }
    const score = norm > 0 ? acc / norm : 0
    const bpm = 60 / (lag * hopSec)
    const beatFit = integerBeatFit(bpm, durationSec)
    const ranked = score * (0.82 + 0.18 * beatFit) * preferredTempoWeight(bpm)
    if (ranked > best) {
      best = ranked
      bestLag = lag
    }
  }
  if (best <= 0) return null
  return { bpm: clampTempo(60 / (bestLag * hopSec)), score: best }
}

function bpmFromIoIs(times: number[]): { bpm: number; score: number } | null {
  if (times.length < 4) return null
  const iois: number[] = []
  for (let i = 1; i < times.length; i++) {
    const dt = (times[i] ?? 0) - (times[i - 1] ?? 0)
    if (dt >= 60 / TEMPO_MAX_BPM && dt <= 60 / TEMPO_MIN_BPM) iois.push(dt)
  }
  if (iois.length < 3) return null
  iois.sort((a, b) => a - b)
  const median = iois[Math.floor(iois.length / 2)] ?? 0
  if (!(median > 0)) return null
  const bpm = clampTempo(60 / median)
  const tight = iois.filter((d) => Math.abs(d - median) / median < 0.12).length
  return { bpm, score: tight / iois.length }
}

function pickBpm(
  ac: { bpm: number; score: number } | null,
  ioi: { bpm: number; score: number } | null,
  durationSec: number,
): { bpm: number; confidence: number } | null {
  const candidates: { bpm: number; score: number }[] = []
  if (ac) {
    for (const mul of [0.5, 1, 2]) {
      const bpm = clampTempo(ac.bpm * mul)
      candidates.push({
        bpm,
        score: ac.score * (mul === 1 ? 1 : 0.85) * preferredTempoWeight(bpm) * (0.78 + 0.22 * integerBeatFit(bpm, durationSec)),
      })
    }
  }
  if (ioi) {
    for (const mul of [0.5, 1, 2]) {
      const bpm = clampTempo(ioi.bpm * mul)
      candidates.push({
        bpm,
        score: ioi.score * (mul === 1 ? 1 : 0.8) * preferredTempoWeight(bpm) * (0.78 + 0.22 * integerBeatFit(bpm, durationSec)),
      })
    }
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.score - a.score)
  const top = candidates[0]!
  if (top.score < 0.018) return null
  return { bpm: roundTempo(top.bpm), confidence: Math.min(1, top.score) }
}

function integerBeatFit(bpm: number, durationSec: number): number {
  if (!(durationSec > 0.2)) return 0.5
  const beats = (durationSec * bpm) / 60
  const nearest = Math.max(1, Math.round(beats))
  const err = Math.abs(beats - nearest) / Math.max(1, nearest)
  return Math.max(0, 1 - err * 8)
}

function preferredTempoWeight(bpm: number): number {
  if (bpm < 70) return 0.72
  if (bpm > 180) return 0.78
  if (bpm >= 90 && bpm <= 150) return 1
  return 0.9
}

export function clampTempo(bpm: number): number {
  if (!Number.isFinite(bpm)) return 120
  let v = bpm
  while (v < TEMPO_MIN_BPM) v *= 2
  while (v > TEMPO_MAX_BPM) v /= 2
  return Math.min(TEMPO_MAX_BPM, Math.max(TEMPO_MIN_BPM, v))
}

export function roundTempo(bpm: number): number {
  const v = clampTempo(bpm)
  return Math.round(v * 10) / 10
}
