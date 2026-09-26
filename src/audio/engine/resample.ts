import type { StretchInterpAlgo } from '../parameters/types'
import { clamp } from '../parameters/mapping'
import { STRETCH_INTERP_ALGOS } from '../parameters/definitions'
import { antiClickSeconds } from './antiClick'
import { advanceStretchControl, type StretchControl } from './stretch'

/**
 * fast — nearest / linear, cheap enough for every grain
 * balanced — cubic, or 4-lobe sinc while a voice is playing
 * high — 8-lobe windowed sinc for offline renders
 */
export type InterpQuality = 'fast' | 'balanced' | 'high'

/** Live grains use the lighter kernel. Offline renders keep the long sinc. */
export type InterpBudget = 'realtime' | 'offline'

const REALTIME_SINC_LOBES = 4
const OFFLINE_SINC_LOBES = 8
const REALTIME_SINC_RADIUS_CAP = 16
const OFFLINE_SINC_RADIUS_CAP = 48

export function sincLobes(budget: InterpBudget): number {
  return budget === 'realtime' ? REALTIME_SINC_LOBES : OFFLINE_SINC_LOBES
}

export function interpQuality(algo: StretchInterpAlgo, budget: InterpBudget): InterpQuality {
  if (algo === 'nearest' || algo === 'linear') return 'fast'
  if (algo === 'sinc' && budget === 'offline') return 'high'
  return 'balanced'
}

export function stretchInterpAlgoAt(value: number): StretchInterpAlgo {
  const i = Math.round(clamp(value, 0, STRETCH_INTERP_ALGOS.length - 1))
  return STRETCH_INTERP_ALGOS[i]?.value ?? 'cubic'
}

export function stretchInterpAlgoIndex(algo: StretchInterpAlgo): number {
  const i = STRETCH_INTERP_ALGOS.findIndex((o) => o.value === algo)
  return i < 0 ? 2 : i
}

/** Effective interpolator: off → nearest, on → selected algorithm. */
export function effectiveInterpAlgo(on: number, algoValue: number): StretchInterpAlgo {
  if (on <= 0.5) return 'nearest'
  return stretchInterpAlgoAt(algoValue)
}

function at(src: ArrayLike<number>, i: number): number {
  if (i < 0 || i >= src.length) return 0
  return src[i] ?? 0
}

function sinc(x: number): number {
  if (Math.abs(x) < 1e-8) return 1
  const pix = Math.PI * x
  return Math.sin(pix) / pix
}

function hannLobe(x: number, lobes: number): number {
  if (Math.abs(x) >= lobes) return 0
  return 0.5 * (1 + Math.cos((Math.PI * x) / lobes))
}

/** Circular read inside a playback region so grains can cross a loop seam. */
export type ReadWrap = {
  /** Inclusive start, exclusive end, in source samples. */
  start: number
  end: number
  mode: 'loop' | 'pingpong'
  /** Source samples of the anti-click dip at the loop join. 0 disables it. */
  seam?: number
}

function wrapIndex(i: number, wrap: ReadWrap): number {
  const start = Math.floor(wrap.start)
  const end = Math.max(start + 1, Math.floor(wrap.end))
  const span = end - start
  if (wrap.mode === 'loop') {
    let rel = (i - start) % span
    if (rel < 0) rel += span
    return start + rel
  }
  const period = span * 2
  let rel = (i - start) % period
  if (rel < 0) rel += period
  if (rel < span) return start + rel
  return end - 1 - (rel - span)
}

/** Gain that meets 0 on both sides of a loop join so the wrap cannot step. */
export function loopSeamGain(index: number, wrap: ReadWrap): number {
  const seam = wrap.seam ?? 0
  if (seam < 2) return 1
  const start = Math.floor(wrap.start)
  const end = Math.max(start + 1, Math.floor(wrap.end))
  const span = end - start
  const cycle = wrap.mode === 'pingpong' ? span * 2 : span
  const width = Math.min(Math.floor(seam), Math.floor(cycle * 0.25))
  if (width < 2) return 1
  let rel = (index - start) % cycle
  if (rel < 0) rel += cycle
  if (rel < width) return rel / width
  if (rel > cycle - width) return Math.max(0, (cycle - rel) / width)
  return 1
}

function readAt(src: ArrayLike<number>, i: number, wrap?: ReadWrap): number {
  if (!wrap) return at(src, i)
  const raw = at(src, wrapIndex(i, wrap))
  if (!(wrap.seam && wrap.seam > 1)) return raw
  return raw * loopSeamGain(i, wrap)
}

/**
 * Map a playback region into the buffer actually being read.
 * Reverse playback uses a time-reversed copy, so the region is mirrored.
 */
export function playbackReadWrap(
  sampleRate: number,
  regionStartSec: number,
  regionEndSec: number,
  durationSec: number,
  reverse: boolean,
  loop: boolean,
  pingpong: boolean,
): ReadWrap | undefined {
  if (!(sampleRate > 0) || (!loop && !pingpong)) return undefined
  const span = regionEndSec - regionStartSec
  if (!(span > 0)) return undefined
  const seam = Math.max(8, Math.round(antiClickSeconds(sampleRate, 1) * sampleRate))
  if (reverse) {
    const revStart = Math.max(0, durationSec - regionEndSec) * sampleRate
    const revEnd = Math.max(0, durationSec - regionStartSec) * sampleRate
    return { start: revStart, end: Math.max(revStart + 1, revEnd), mode: 'loop', seam }
  }
  const start = regionStartSec * sampleRate
  const end = Math.max(start + 1, regionEndSec * sampleRate)
  return {
    start,
    end,
    mode: pingpong ? 'pingpong' : 'loop',
    seam,
  }
}

/**
 * Read `src` at fractional sample `pos`.
 * `step` is source samples per output sample (pitch ratio). When > 1 the sinc
 * cutoff drops so downsampling stays band-limited.
 * Realtime sinc is 4 lobes; offline sinc is 8. Nearest and linear stay cheap.
 */
export function sampleAt(
  src: ArrayLike<number>,
  pos: number,
  algo: StretchInterpAlgo,
  step = 1,
  budget: InterpBudget = 'offline',
  wrap?: ReadWrap,
): number {
  if (!(src.length > 0) || !Number.isFinite(pos)) return 0
  const sample = (i: number) => readAt(src, i, wrap)
  switch (algo) {
    case 'nearest': {
      return sample(Math.round(pos))
    }
    case 'linear': {
      const i0 = Math.floor(pos)
      const t = pos - i0
      return sample(i0) * (1 - t) + sample(i0 + 1) * t
    }
    case 'cubic': {
      const i1 = Math.floor(pos)
      const t = pos - i1
      const y0 = sample(i1 - 1)
      const y1 = sample(i1)
      const y2 = sample(i1 + 1)
      const y3 = sample(i1 + 2)
      const c1 = 0.5 * (y2 - y0)
      const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3
      const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2)
      return ((c3 * t + c2) * t + c1) * t + y1
    }
    case 'sinc': {
      const cutoff = Math.min(1, 1 / Math.max(step, 1e-6))
      const center = Math.floor(pos)
      const lobes = sincLobes(budget)
      const cap = budget === 'realtime' ? REALTIME_SINC_RADIUS_CAP : OFFLINE_SINC_RADIUS_CAP
      const radius = Math.min(cap, Math.max(lobes, Math.ceil(lobes / cutoff)))
      let sum = 0
      let wsum = 0
      const i0 = center - radius
      const i1 = center + radius
      for (let i = i0; i <= i1; i++) {
        const x = (pos - i) * cutoff
        const w = sinc(x) * hannLobe(x, lobes)
        sum += sample(i) * w
        wsum += w
      }
      return wsum > 1e-8 ? sum / wsum : 0
    }
  }
}

export function hannAt(i: number, n: number): number {
  if (n <= 1) return 1
  return 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
}

/** Short equal-power ramps at grain edges — stops clicks when interpolation is off. */
export function edgeFadeAt(i: number, n: number, fadeSamples: number): number {
  if (n <= 1) return 1
  const fade = Math.max(1, Math.min(fadeSamples, Math.floor(n / 4)))
  if (i < fade) return i / fade
  if (i > n - 1 - fade) return (n - 1 - i) / fade
  return 1
}

/** Fill `dest[0..count)` from `src` starting at fractional `pos`, stepping by `step`. */
export function resampleInto(
  dest: Float32Array,
  count: number,
  src: ArrayLike<number>,
  pos: number,
  step: number,
  algo: StretchInterpAlgo,
  windowed: boolean,
  gain = 1,
  budget: InterpBudget = 'offline',
  wrap?: ReadWrap,
): void {
  const n = Math.max(0, Math.min(count, dest.length))
  const g = Number.isFinite(gain) ? gain : 1
  const edge = Math.max(8, Math.floor(n * 0.04))
  const stride = Number.isFinite(step) ? step : 1
  for (let i = 0; i < n; i++) {
    const s = sampleAt(src, pos + i * stride, algo, Math.abs(stride), budget, wrap)
    const env = windowed ? hannAt(i, n) : edgeFadeAt(i, n, edge)
    dest[i] = s * g * env
  }
}

/** Goertzel magnitude at `hz` — used to check pitch-down bass energy. */
export function goertzelMagnitude(samples: ArrayLike<number>, sampleRate: number, hz: number): number {
  if (!(sampleRate > 0) || !(hz > 0) || samples.length < 8) return 0
  const w = (2 * Math.PI * hz) / sampleRate
  const coeff = 2 * Math.cos(w)
  let s0 = 0
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < samples.length; i++) {
    s0 = (samples[i] ?? 0) + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  const real = s1 - s2 * Math.cos(w)
  const imag = s2 * Math.sin(w)
  return Math.hypot(real, imag) / samples.length
}

/**
 * Overlap-add a pitched/time-scaled slice. Output hop is `hopSamples`; the
 * read head advances `hopSamples * speed` in the source (independent tempo).
 */
export function overlapAddResample(
  src: ArrayLike<number>,
  outputLength: number,
  grainSamples: number,
  hopSamples: number,
  speed: number,
  pitchRatio: number,
  algo: StretchInterpAlgo,
  start = 0,
  budget: InterpBudget = 'offline',
  wrap?: ReadWrap,
): Float32Array {
  const out = new Float32Array(Math.max(1, outputLength))
  const grain = Math.max(8, Math.floor(grainSamples))
  const hop = Math.max(1, Math.floor(hopSamples))
  const step = Math.max(1e-6, pitchRatio)
  const srcHop = hop * Math.max(1e-6, speed)
  const scratch = new Float32Array(grain)
  let srcPos = start
  let outPos = 0
  const peak = clamp((hop / grain) * 1.08, 0.14, 0.62)
  while (outPos < out.length) {
    resampleInto(scratch, grain, src, srcPos, step, algo, true, peak, budget, wrap)
    const n = Math.min(grain, out.length - outPos)
    for (let i = 0; i < n; i++) out[outPos + i]! += scratch[i] ?? 0
    srcPos += srcHop
    outPos += hop
  }
  return out
}

/**
 * Offline overlap-add that uses the same Speed glide as live playback.
 * `budget` defaults to offline so a bounce can keep the long sinc.
 * Speed still only moves the read head; pitch stays on `readPitch`.
 */
export function renderGlidedStretch(
  src: ArrayLike<number>,
  outputLength: number,
  sampleRate: number,
  interp: number,
  speedFrom: number,
  speedTo: number,
  pitchSemitones: number,
  algo: StretchInterpAlgo,
  budget: InterpBudget = 'offline',
  wrap?: ReadWrap,
): Float32Array {
  const out = new Float32Array(Math.max(1, outputLength))
  const sr = Math.max(1, sampleRate)
  let control: StretchControl = {
    speed: Math.max(1e-4, speedFrom),
    pitch: pitchSemitones,
    windowSpeed: Math.max(1e-4, speedFrom),
    windowPitch: pitchSemitones,
  }
  let srcPos = 0
  let outPos = 0
  let guard = 0
  while (outPos < out.length && guard < out.length) {
    guard += 1
    const step = advanceStretchControl(control, speedTo, pitchSemitones, interp)
    control = step
    const grain = Math.max(8, Math.round(step.grainSec * sr))
    const hop = Math.max(1, Math.round(step.hopSec * sr))
    const scratch = new Float32Array(grain)
    resampleInto(scratch, grain, src, srcPos, step.readPitch, algo, true, step.peak, budget, wrap)
    const n = Math.min(grain, out.length - outPos)
    for (let i = 0; i < n; i++) out[outPos + i]! += scratch[i] ?? 0
    srcPos += step.sourceAdvance * sr
    if (wrap && srcPos >= wrap.end) {
      const span = Math.max(1, wrap.end - wrap.start)
      srcPos = wrap.start + ((srcPos - wrap.start) % span)
    }
    outPos += hop
  }
  return out
}
