/**
 * Shared static analysis of a PCM span.
 * One call feeds the fingerprint, events, dynamics map, space map, and sound map.
 * No AnalyserNode is created here. FFT uses the engine's timeDomainToDb.
 */

import { hzToNoteName } from '../audio/engine/pitchScale'
import { timeDomainToDb, type SpectrumFftScratch } from '../audio/engine/spectrumFft'
import { HEARING_BANDS, type HearingBandId, bandForHz } from './bands'
import { CLIP_AMPLITUDE, DB_FLOOR, SILENCE_PEAK, amplitudeToDbfs, dbfsToPower, powerToDbfs } from './levels'
import { spectralTones, type ToneMoment } from './tones'

export type AnalysisScope = 'selection' | 'current' | 'full'

export type StereoMetrics = {
  balance: number
  /** Positive balance is right-heavy. */
  balanceSide: 'L' | 'R' | 'C'
  balancePct: number
  /** Channel with the higher mean square, in dB relative to the other. */
  channelDeltaDb: number
  width: number
  correlation: number
  midShare: number
  sideShare: number
  lowCorrelation: boolean
}

export type BandMeasure = {
  id: HearingBandId
  label: string
  lo: number
  hi: number
  hatch: string
  power: number
  share: number
  db: number | null
}

export type DynamicsBucket = {
  time: number
  peakDb: number | null
  rmsDb: number | null
  clip: boolean
  transient: boolean
}

export type SpaceBucket = {
  time: number
  balance: number
  width: number
  correlation: number
}

export type SoundMapColumn = {
  time: number
  /** Linear power per hearing band, low to high index matching HEARING_BANDS. */
  power: number[]
}

export type PcmSpan = {
  left: ArrayLike<number>
  right?: ArrayLike<number> | null
  sampleRate: number
  startFrame: number
  endFrame: number
  originSec: number
  scope: AnalysisScope
}

export type AnalysisOptions = {
  soundMap?: boolean
  maxMapColumns?: number
}

export type BufferAnalysis = {
  scope: AnalysisScope
  originSec: number
  durationSec: number
  sampleRate: number
  silent: boolean
  peak: number
  peakDbfs: number | null
  rms: number
  rmsDbfs: number | null
  crestDb: number | null
  dcOffset: number
  clipped: boolean
  clipCount: number
  bands: BandMeasure[]
  dominantHz: number | null
  dominantNote: string | null
  dominantBand: HearingBandId | null
  flatness: number | null
  peakProminenceDb: number | null
  /** True only for a narrow spectral peak. Noise and silence are false. */
  narrowTonal: boolean
  tonality: 'high' | 'moderate' | 'low' | null
  noise: 'low' | 'moderate' | 'high' | null
  transientLevel: 'low' | 'moderate' | 'high' | null
  stereo: StereoMetrics | null
  dynamics: DynamicsBucket[]
  spaceTimeline: SpaceBucket[]
  soundMap: SoundMapColumn[] | null
  /** Detected partials over time. Tags read the moment under the playhead. */
  toneTimeline: ToneMoment[]
  spectrumDb: Float32Array
  fftSize: number
}

const FFT_PREFERRED = 4096

function chooseFft(frames: number): number {
  if (frames >= FFT_PREFERRED) return FFT_PREFERRED
  if (frames >= 2048) return 2048
  if (frames >= 1024) return 1024
  if (frames >= 512) return 512
  return 0
}

function frameCount(span: PcmSpan): number {
  const available = span.left.length
  const start = Math.max(0, Math.min(available, Math.floor(span.startFrame)))
  const end = Math.max(start, Math.min(available, Math.floor(span.endFrame)))
  return end - start
}

function sampleAt(data: ArrayLike<number>, index: number): number {
  const value = data[index] ?? 0
  return Number.isFinite(value) ? value : 0
}

export function resolveScope(durationSec: number, startSec: number, endSec: number, playing: boolean): AnalysisScope {
  if (!(durationSec > 0)) return 'full'
  const covers = startSec <= 0.01 && endSec >= durationSec - 0.02
  if (!covers && endSec - startSec > 0.01) return 'selection'
  if (playing) return 'current'
  return 'full'
}

type LevelScan = {
  peak: number
  sumSq: number
  sum: number
  count: number
  clipCount: number
  dcSum: number
}

function scanLevels(span: PcmSpan): { left: LevelScan; right: LevelScan | null; frames: number } {
  const frames = frameCount(span)
  const start = Math.max(0, Math.floor(span.startFrame))
  const left = scanChannel(span.left, start, frames)
  const rightData = span.right
  const right = rightData && rightData.length > start ? scanChannel(rightData, start, frames) : null
  return { left, right, frames }
}

function scanChannel(data: ArrayLike<number>, start: number, frames: number): LevelScan {
  let peak = 0
  let sumSq = 0
  let sum = 0
  let count = 0
  let clipCount = 0
  const end = Math.min(data.length, start + frames)
  for (let i = start; i < end; i++) {
    const x = sampleAt(data, i)
    const a = Math.abs(x)
    if (a > peak) peak = a
    sumSq += x * x
    sum += x
    count++
    if (a >= CLIP_AMPLITUDE) clipCount++
  }
  return { peak, sumSq, sum, count, clipCount, dcSum: sum }
}

function mixFrame(span: PcmSpan, index: number): number {
  const l = sampleAt(span.left, index)
  const right = span.right
  if (!right || index >= right.length) return l
  return (l + sampleAt(right, index)) * 0.5
}

function spectrumOf(span: PcmSpan, fftSize: number, scratch: SpectrumFftScratch): Float32Array {
  const bins = new Float32Array(fftSize >> 1)
  bins.fill(DB_FLOOR)
  const frames = frameCount(span)
  const start = Math.max(0, Math.floor(span.startFrame))
  if (fftSize < 256 || frames < fftSize) return bins
  const step = Math.max(fftSize >> 2, Math.floor((frames - fftSize) / 24) || fftSize >> 2)
  const window = new Float32Array(fftSize)
  const frame = new Float32Array(bins.length)
  const starts: number[] = []
  for (let from = 0; from + fftSize <= frames; from += step) starts.push(from)
  const last = frames - fftSize
  if (starts.length === 0 || starts[starts.length - 1] !== last) starts.push(last)
  let primed = false
  for (const from of starts) {
    for (let i = 0; i < fftSize; i++) window[i] = mixFrame(span, start + from + i)
    timeDomainToDb(window, frame, scratch, DB_FLOOR)
    if (!primed) {
      bins.set(frame)
      primed = true
    } else {
      for (let i = 0; i < bins.length; i++) {
        const db = frame[i] ?? DB_FLOOR
        if (db > (bins[i] ?? DB_FLOOR)) bins[i] = db
      }
    }
  }
  return bins
}

function bandMeasures(bins: Float32Array, sampleRate: number, fftSize: number, silent: boolean): BandMeasure[] {
  const power = HEARING_BANDS.map(() => 0)
  let total = 0
  for (let i = 1; i < bins.length; i++) {
    const hz = (i * sampleRate) / fftSize
    const band = bandForHz(hz)
    if (!band) continue
    const p = silent ? 0 : dbfsToPower(bins[i] ?? DB_FLOOR)
    const index = HEARING_BANDS.findIndex((item) => item.id === band.id)
    if (index >= 0) power[index] = (power[index] ?? 0) + p
    total += p
  }
  return HEARING_BANDS.map((band, index) => {
    const p = power[index] ?? 0
    const share = !silent && total > 0 ? p / total : 0
    return {
      id: band.id,
      label: band.label,
      lo: band.lo,
      hi: band.hi,
      hatch: band.hatch,
      power: silent ? 0 : p,
      share,
      db: silent ? null : powerToDbfs(p),
    }
  })
}

function dominantFrequency(bins: Float32Array, sampleRate: number, fftSize: number, silent: boolean): {
  hz: number | null
  prominenceDb: number | null
} {
  if (silent || bins.length < 4) return { hz: null, prominenceDb: null }
  let peakBin = 1
  let peakDb = DB_FLOOR
  const values: number[] = []
  for (let i = 1; i < bins.length; i++) {
    const db = bins[i] ?? DB_FLOOR
    values.push(db)
    if (db > peakDb) {
      peakDb = db
      peakBin = i
    }
  }
  if (peakDb < -80) return { hz: null, prominenceDb: null }
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? DB_FLOOR
  const prominence = peakDb - median
  if (prominence < 6) return { hz: null, prominenceDb: prominence }
  const prev = dbfsToPower(bins[peakBin - 1] ?? DB_FLOOR)
  const mid = dbfsToPower(bins[peakBin] ?? DB_FLOOR)
  const next = dbfsToPower(bins[peakBin + 1] ?? DB_FLOOR)
  const denom = prev - 2 * mid + next
  let delta = 0
  if (Math.abs(denom) > 1e-18) delta = (0.5 * (prev - next)) / denom
  delta = Math.max(-0.5, Math.min(0.5, delta))
  const hz = ((peakBin + delta) * sampleRate) / fftSize
  if (!(hz > 1)) return { hz: null, prominenceDb: prominence }
  return { hz, prominenceDb: prominence }
}

function spectralFlatness(bins: Float32Array, silent: boolean): number | null {
  if (silent) return null
  let logSum = 0
  let count = 0
  let linear = 0
  for (let i = 1; i < bins.length; i++) {
    const power = Math.max(1e-12, dbfsToPower(bins[i] ?? DB_FLOOR))
    logSum += Math.log(power)
    linear += power
    count++
  }
  if (count < 8 || !(linear > 0)) return null
  const geo = Math.exp(logSum / count)
  return geo / (linear / count)
}

function classifyCharacter(flatness: number | null, prominence: number | null, silent: boolean, crestDb: number | null): {
  narrowTonal: boolean
  tonality: BufferAnalysis['tonality']
  noise: BufferAnalysis['noise']
  transientLevel: BufferAnalysis['transientLevel']
} {
  if (silent) return { narrowTonal: false, tonality: null, noise: null, transientLevel: null }
  const narrowTonal = flatness !== null && flatness < 0.15 && (prominence ?? 0) >= 10
  let tonality: BufferAnalysis['tonality'] = 'moderate'
  if (narrowTonal || (flatness !== null && flatness < 0.12 && (prominence ?? 0) >= 8)) tonality = 'high'
  else if (flatness === null || flatness > 0.45 || (prominence ?? 0) < 8) tonality = 'low'
  let noise: BufferAnalysis['noise'] = 'moderate'
  if (flatness === null) noise = null
  else if (flatness > 0.5) noise = 'high'
  else if (flatness < 0.2) noise = 'low'
  let transientLevel: BufferAnalysis['transientLevel'] = 'low'
  if (crestDb === null) transientLevel = null
  else if (crestDb >= 12) transientLevel = 'high'
  else if (crestDb >= 6) transientLevel = 'moderate'
  return { narrowTonal, tonality, noise, transientLevel }
}

export function stereoMetrics(left: ArrayLike<number>, right: ArrayLike<number> | null | undefined, start: number, frames: number): StereoMetrics | null {
  if (!right) return null
  const end = Math.min(left.length, right.length, start + frames)
  const from = Math.max(0, start)
  let sumLL = 0
  let sumRR = 0
  let sumLR = 0
  let sumMid = 0
  let sumSide = 0
  let count = 0
  for (let i = from; i < end; i++) {
    const l = sampleAt(left, i)
    const r = sampleAt(right, i)
    sumLL += l * l
    sumRR += r * r
    sumLR += l * r
    const mid = (l + r) * 0.5
    const side = (l - r) * 0.5
    sumMid += mid * mid
    sumSide += side * side
    count++
  }
  if (count < 8) return null
  const rmsL = Math.sqrt(sumLL / count)
  const rmsR = Math.sqrt(sumRR / count)
  const denom = rmsL + rmsR
  const balance = denom > SILENCE_PEAK ? (rmsR - rmsL) / denom : 0
  const corrDenom = Math.sqrt(sumLL * sumRR)
  const correlation = corrDenom > 1e-18 ? Math.max(-1, Math.min(1, sumLR / corrDenom)) : 1
  const energy = sumMid + sumSide
  const sideShare = energy > 0 ? sumSide / energy : 0
  const midShare = energy > 0 ? sumMid / energy : 1
  const side: StereoMetrics['balanceSide'] = Math.abs(balance) < 0.03 ? 'C' : balance > 0 ? 'R' : 'L'
  const delta = amplitudeToDbfs(Math.max(rmsL, rmsR)) 
  const quieter = amplitudeToDbfs(Math.min(rmsL, rmsR))
  const channelDeltaDb = delta !== null && quieter !== null ? delta - quieter : 0
  return {
    balance,
    balanceSide: side,
    balancePct: Math.abs(balance) * 100,
    channelDeltaDb,
    width: sideShare,
    correlation,
    midShare,
    sideShare,
    lowCorrelation: correlation < 0.2,
  }
}

function dynamicsMap(span: PcmSpan, silent: boolean): DynamicsBucket[] {
  const frames = frameCount(span)
  const buckets = Math.max(1, Math.min(160, Math.ceil(frames / 512)))
  const start = Math.max(0, Math.floor(span.startFrame))
  const out: DynamicsBucket[] = []
  let prevPeak = 0
  for (let b = 0; b < buckets; b++) {
    const a = start + Math.floor((b * frames) / buckets)
    const c = start + Math.floor(((b + 1) * frames) / buckets)
    let peak = 0
    let sumSq = 0
    let count = 0
    let clip = false
    for (let i = a; i < c; i++) {
      const x = mixFrame(span, i)
      const amp = Math.abs(x)
      if (amp > peak) peak = amp
      sumSq += x * x
      count++
      if (amp >= CLIP_AMPLITUDE) clip = true
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0
    const transient = !silent && b > 0 && peak > 0.05 && peak > prevPeak * 4 && peak > 0.05
    prevPeak = peak
    out.push({
      time: span.originSec + (a - start) / span.sampleRate,
      peakDb: silent ? null : amplitudeToDbfs(peak),
      rmsDb: silent ? null : amplitudeToDbfs(rms),
      clip,
      transient,
    })
  }
  return out
}

function spaceTimeline(span: PcmSpan): SpaceBucket[] {
  if (!span.right) return []
  const frames = frameCount(span)
  const buckets = Math.max(1, Math.min(64, Math.ceil(frames / 2048)))
  const start = Math.max(0, Math.floor(span.startFrame))
  const out: SpaceBucket[] = []
  for (let b = 0; b < buckets; b++) {
    const a = start + Math.floor((b * frames) / buckets)
    const count = Math.max(1, Math.floor(frames / buckets))
    const metrics = stereoMetrics(span.left, span.right, a, count)
    out.push({
      time: span.originSec + (a - start) / span.sampleRate,
      balance: metrics?.balance ?? 0,
      width: metrics?.width ?? 0,
      correlation: metrics?.correlation ?? 1,
    })
  }
  return out
}

function windowCrestDb(samples: Float32Array): number | null {
  let peak = 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0
    const abs = Math.abs(sample)
    if (abs > peak) peak = abs
    sum += sample * sample
  }
  if (!(peak > 1e-5) || samples.length === 0) return null
  const rms = Math.sqrt(sum / samples.length)
  if (!(rms > 1e-8)) return null
  return 20 * Math.log10(peak / rms)
}

function centroidHz(bins: Float32Array, sampleRate: number, fftSize: number): number | null {
  let weight = 0
  let mass = 0
  for (let i = 1; i < bins.length; i++) {
    const power = dbfsToPower(bins[i] ?? DB_FLOOR)
    if (!(power > 0)) continue
    weight += power * ((i * sampleRate) / fftSize)
    mass += power
  }
  if (!(mass > 0)) return null
  return weight / mass
}

function momentFlatness(bins: Float32Array): number | null {
  let logSum = 0
  let count = 0
  let linear = 0
  for (let i = 1; i < bins.length; i++) {
    const power = Math.max(1e-12, dbfsToPower(bins[i] ?? DB_FLOOR))
    logSum += Math.log(power)
    linear += power
    count++
  }
  if (count < 8 || !(linear > 0)) return null
  return Math.exp(logSum / count) / (linear / count)
}

/** One spectrum per slice, so a note tag can appear only while that slice is under the playhead. */
function toneTimeline(span: PcmSpan, scratch: SpectrumFftScratch): ToneMoment[] {
  const frames = frameCount(span)
  const fftSize = frames >= 2048 ? 2048 : frames >= 1024 ? 1024 : 0
  if (!fftSize) return []
  const count = Math.max(1, Math.min(64, Math.floor(frames / fftSize) || 1))
  const start = Math.max(0, Math.floor(span.startFrame))
  const out: ToneMoment[] = []
  const window = new Float32Array(fftSize)
  const bins = new Float32Array(fftSize >> 1)
  for (let col = 0; col < count; col++) {
    const from = start + Math.min(frames - fftSize, Math.floor((col * Math.max(0, frames - fftSize)) / Math.max(1, count - 1)))
    let peak = 0
    for (let i = 0; i < fftSize; i++) {
      const sample = mixFrame(span, from + i)
      window[i] = sample
      const abs = Math.abs(sample)
      if (abs > peak) peak = abs
    }
    const time = span.originSec + (from - start) / span.sampleRate
    if (peak < 1e-4) {
      out.push({ time, tones: [], flatness: null, centroidHz: null, crestDb: null })
      continue
    }
    timeDomainToDb(window, bins, scratch, DB_FLOOR)
    out.push({
      time,
      tones: spectralTones(bins, span.sampleRate, fftSize, 1),
      flatness: momentFlatness(bins),
      centroidHz: centroidHz(bins, span.sampleRate, fftSize),
      crestDb: windowCrestDb(window),
    })
  }
  return out
}

function soundMap(span: PcmSpan, columns: number, scratch: SpectrumFftScratch): SoundMapColumn[] {
  const frames = frameCount(span)
  const fftSize = frames >= 2048 ? 2048 : frames >= 1024 ? 1024 : 0
  if (!fftSize) return []
  const count = Math.max(1, Math.min(columns, Math.floor(frames / fftSize) || 1))
  const start = Math.max(0, Math.floor(span.startFrame))
  const out: SoundMapColumn[] = []
  const window = new Float32Array(fftSize)
  const bins = new Float32Array(fftSize >> 1)
  for (let col = 0; col < count; col++) {
    const from = start + Math.min(frames - fftSize, Math.floor((col * Math.max(0, frames - fftSize)) / Math.max(1, count - 1)))
    for (let i = 0; i < fftSize; i++) window[i] = mixFrame(span, from + i)
    timeDomainToDb(window, bins, scratch, DB_FLOOR)
    const power = HEARING_BANDS.map(() => 0)
    for (let i = 1; i < bins.length; i++) {
      const hz = (i * span.sampleRate) / fftSize
      const band = bandForHz(hz)
      if (!band) continue
      const index = HEARING_BANDS.findIndex((item) => item.id === band.id)
      if (index < 0) continue
      const bin = dbfsToPower(bins[i] ?? DB_FLOOR)
      if (bin > (power[index] ?? 0)) power[index] = bin
    }
    out.push({ time: span.originSec + (from - start) / span.sampleRate, power })
  }
  return out
}

export function analyzePcm(span: PcmSpan, options: AnalysisOptions = {}): BufferAnalysis {
  const sampleRate = span.sampleRate > 0 ? span.sampleRate : 44100
  const frames = frameCount(span)
  const levels = scanLevels({ ...span, sampleRate })
  const rightPeak = levels.right?.peak ?? 0
  const peak = Math.max(levels.left.peak, rightPeak)
  const sumSq = levels.left.sumSq + (levels.right?.sumSq ?? 0)
  const count = levels.left.count + (levels.right?.count ?? 0)
  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0
  const silent = peak < SILENCE_PEAK
  const dcCount = levels.left.count + (levels.right?.count ?? 0)
  const dcOffset = dcCount > 0 ? (levels.left.dcSum + (levels.right?.dcSum ?? 0)) / dcCount : 0
  const clipCount = levels.left.clipCount + (levels.right?.clipCount ?? 0)
  const fftSize = chooseFft(frames)
  const scratch: SpectrumFftScratch = { window: null, real: null, imag: null }
  const spectrumDb = fftSize ? spectrumOf({ ...span, sampleRate }, fftSize, scratch) : new Float32Array(0)
  const bands = bandMeasures(spectrumDb, sampleRate, fftSize || 2, silent || !fftSize)
  const dominant = dominantFrequency(spectrumDb, sampleRate, fftSize || 2, silent || !fftSize)
  const flatness = spectralFlatness(spectrumDb, silent || !fftSize)
  const peakDbfs = silent ? null : amplitudeToDbfs(peak)
  const rmsDbfs = silent ? null : amplitudeToDbfs(rms)
  const crestDb = peakDbfs !== null && rmsDbfs !== null ? peakDbfs - rmsDbfs : null
  const character = classifyCharacter(flatness, dominant.prominenceDb, silent, crestDb)
  const broad = flatness !== null && flatness > 0.4
  const dominantHz = broad ? null : dominant.hz
  const note = dominantHz ? hzToNoteName(dominantHz) : null
  const region = dominantHz ? bandForHz(dominantHz) : null
  return {
    scope: span.scope,
    originSec: span.originSec,
    durationSec: frames / sampleRate,
    sampleRate,
    silent,
    peak,
    peakDbfs,
    rms,
    rmsDbfs,
    crestDb,
    dcOffset: silent ? 0 : dcOffset,
    clipped: clipCount > 0,
    clipCount,
    bands,
    dominantHz,
    dominantNote: note,
    dominantBand: region?.id ?? null,
    flatness,
    peakProminenceDb: silent || broad ? null : dominant.prominenceDb,
    narrowTonal: character.narrowTonal,
    tonality: character.tonality,
    noise: character.noise,
    transientLevel: character.transientLevel,
    stereo: stereoMetrics(span.left, span.right ?? null, Math.max(0, Math.floor(span.startFrame)), frames),
    dynamics: dynamicsMap({ ...span, sampleRate }, silent),
    spaceTimeline: spaceTimeline({ ...span, sampleRate }),
    soundMap: options.soundMap ? soundMap({ ...span, sampleRate }, options.maxMapColumns ?? 96, scratch) : null,
    toneTimeline: silent ? [] : toneTimeline({ ...span, sampleRate }, scratch),
    spectrumDb,
    fftSize,
  }
}

export function shareBelowHz(analysis: BufferAnalysis, hz: number): number {
  return analysis.bands.filter((band) => band.hi <= hz || band.lo < hz).reduce((sum, band) => {
    if (band.hi <= hz) return sum + band.share
    if (band.lo >= hz) return sum
    const frac = (hz - band.lo) / Math.max(1, band.hi - band.lo)
    return sum + band.share * frac
  }, 0)
}

export function emptyAnalysis(scope: AnalysisScope = 'full'): BufferAnalysis {
  return analyzePcm(
    { left: new Float32Array(512), right: null, sampleRate: 44100, startFrame: 0, endFrame: 512, originSec: 0, scope },
    { soundMap: false },
  )
}
