import type { StretchInterpAlgo } from '../parameters/types'
import { clamp } from '../parameters/mapping'
import { STRETCH_INTERP_ALGOS } from '../parameters/definitions'

const SINC_LOBES = 8

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

/**
 * Read `src` at fractional sample `pos`.
 * `step` is source samples per output sample (pitch ratio). When > 1 the sinc
 * cutoff drops so downsampling stays band-limited.
 */
export function sampleAt(
  src: ArrayLike<number>,
  pos: number,
  algo: StretchInterpAlgo,
  step = 1,
): number {
  if (!(src.length > 0) || !Number.isFinite(pos)) return 0
  switch (algo) {
    case 'nearest': {
      return at(src, Math.round(pos))
    }
    case 'linear': {
      const i0 = Math.floor(pos)
      const t = pos - i0
      return at(src, i0) * (1 - t) + at(src, i0 + 1) * t
    }
    case 'cubic': {
      const i1 = Math.floor(pos)
      const t = pos - i1
      const y0 = at(src, i1 - 1)
      const y1 = at(src, i1)
      const y2 = at(src, i1 + 1)
      const y3 = at(src, i1 + 2)
      const c1 = 0.5 * (y2 - y0)
      const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3
      const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2)
      return ((c3 * t + c2) * t + c1) * t + y1
    }
    case 'sinc': {
      const cutoff = Math.min(1, 1 / Math.max(step, 1e-6))
      const center = Math.floor(pos)
      const lobes = SINC_LOBES
      let sum = 0
      let wsum = 0
      const i0 = center - lobes
      const i1 = center + lobes
      for (let i = i0; i <= i1; i++) {
        const x = (pos - i) * cutoff
        const w = sinc(x) * hannLobe(x, lobes)
        sum += at(src, i) * w
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
): void {
  const n = Math.max(0, Math.min(count, dest.length))
  const g = Number.isFinite(gain) ? gain : 1
  for (let i = 0; i < n; i++) {
    const s = sampleAt(src, pos + i * step, algo, step)
    dest[i] = s * g * (windowed ? hannAt(i, n) : 1)
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
    resampleInto(scratch, grain, src, srcPos, step, algo, true, peak)
    const n = Math.min(grain, out.length - outPos)
    for (let i = 0; i < n; i++) out[outPos + i]! += scratch[i] ?? 0
    srcPos += srcHop
    outPos += hop
  }
  return out
}
