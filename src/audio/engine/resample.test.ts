import { describe, expect, it } from 'vitest'
import { stretchWindow } from './stretch'
import { pitchRatio } from '../parameters/mapping'
import { GRAIN_OVERLAP_DEFAULT } from './stretch'
import {
  effectiveInterpAlgo,
  goertzelMagnitude,
  interpKernelTaps,
  interpQuality,
  overlapAddResample,
  playbackReadWrap,
  renderGlidedStretch,
  resampleInto,
  sampleAt,
  sincLobes,
  stretchInterpAlgoAt,
} from './resample'

function sine(length: number, sr: number, hz: number): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / sr)
  return out
}

function rms(samples: ArrayLike<number>): number {
  if (samples.length < 1) return 0
  let acc = 0
  for (let i = 0; i < samples.length; i++) acc += (samples[i] ?? 0) ** 2
  return Math.sqrt(acc / samples.length)
}

describe('stretchInterpAlgoAt', () => {
  it('maps stored indices onto three different kernels', () => {
    expect(stretchInterpAlgoAt(0)).toBe('linear')
    expect(stretchInterpAlgoAt(1)).toBe('cubic')
    expect(stretchInterpAlgoAt(2)).toBe('sinc')
    expect(stretchInterpAlgoAt(9)).toBe('sinc')
  })

  it('keeps the selected kernel when the legacy on/off flag is off', () => {
    expect(effectiveInterpAlgo(0, 0)).toBe('linear')
    expect(effectiveInterpAlgo(0, 1)).toBe('cubic')
    expect(effectiveInterpAlgo(0, 2)).toBe('sinc')
  })
})

describe('resampleInto', () => {
  it('fades unwindowed edges so nearest-neighbor grains do not click', () => {
    const dest = new Float32Array(32)
    dest.fill(1)
    resampleInto(dest, 32, new Float32Array(64).fill(1), 0, 1, 'nearest', false, 1)
    expect(dest[0]).toBeCloseTo(0)
    expect(dest[16]).toBeCloseTo(1)
    expect(dest[31]).toBeCloseTo(0)
  })
})

describe('sampleAt', () => {
  it('hits exact samples for every algorithm', () => {
    const src = new Float32Array([0, 0.5, 1, 0.5, 0])
    for (const algo of ['nearest', 'linear', 'cubic', 'sinc'] as const) {
      expect(sampleAt(src, 2, algo)).toBeCloseTo(1, algo === 'sinc' ? 1 : 5)
    }
  })

  it('linear interpolates halfway', () => {
    const src = new Float32Array([0, 10])
    expect(sampleAt(src, 0.5, 'linear')).toBeCloseTo(5)
  })
})

describe('pitch-down bass', () => {
  it('moves a 200 Hz tone to 100 Hz when the ratio is 1/2', () => {
    const sr = 48000
    const src = sine(sr, sr, 200)
    const out = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'cubic', 0)
    const low = goertzelMagnitude(out, sr, 100)
    const orig = goertzelMagnitude(out, sr, 200)
    expect(low).toBeGreaterThan(orig * 4)
    expect(low).toBeGreaterThan(0.003)
  })

  it('adds more low-frequency energy than an unpitched grain train', () => {
    const sr = 48000
    const src = sine(sr, sr, 180)
    const unity = overlapAddResample(src, sr, 4096, 1024, 1, 1, 'cubic', 0)
    const down = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'cubic', 0)
    const bassUnity = goertzelMagnitude(unity, sr, 90)
    const bassDown = goertzelMagnitude(down, sr, 90)
    expect(bassDown).toBeGreaterThan(bassUnity * 3)
  })

  it('keeps more 40 Hz energy with pitch-scaled grains than with short ones', () => {
    const sr = 48000
    const src = sine(Math.floor(sr * 1.2), sr, 80)
    const short = stretchWindow(100, 1, 1)
    const long = stretchWindow(100, 1, 0.5)
    const shortN = Math.round(short.grainSec * sr)
    const longN = Math.round(long.grainSec * sr)
    const shortHop = Math.round(short.hopSec * sr)
    const longHop = Math.round(long.hopSec * sr)
    const a = overlapAddResample(src, sr, shortN, shortHop, 1, 0.5, 'cubic', 0)
    const b = overlapAddResample(src, sr, longN, longHop, 1, 0.5, 'cubic', 0)
    expect(goertzelMagnitude(b, sr, 40)).toBeGreaterThan(goertzelMagnitude(a, sr, 40))
    expect(long.grainSec).toBeGreaterThan(short.grainSec * 1.5)
  })

  it('ducks a loop join instead of stepping from the tail to the head', () => {
    const src = new Float32Array(1000)
    for (let i = 0; i < src.length; i++) src[i] = -0.8 + (1.6 * i) / (src.length - 1)
    const wrap = { start: 0, end: 1000, mode: 'loop' as const, seam: 48 }
    const dest = new Float32Array(80)
    resampleInto(dest, 80, src, 970, 1, 'linear', true, 1, 'realtime', wrap)
    let maxJump = 0
    for (let i = 1; i < dest.length; i++) {
      maxJump = Math.max(maxJump, Math.abs((dest[i] ?? 0) - (dest[i - 1] ?? 0)))
    }
    expect(maxJump).toBeLessThan(0.08)
  })

  it('wraps a loop seam so the grain does not fall into silence', () => {
    const src = new Float32Array(200).fill(0.6)
    const dest = new Float32Array(48)
    const wrap = { start: 0, end: 200, mode: 'loop' as const }
    resampleInto(dest, 48, src, 180, 1, 'linear', false, 1, 'realtime', wrap)
    expect(dest[24]).toBeCloseTo(0.6, 2)
    const open = new Float32Array(48)
    resampleInto(open, 48, src, 180, 1, 'linear', false, 1, 'realtime')
    expect(Math.abs(open[24] ?? 0)).toBeLessThan(0.05)
  })

  it('maps a reversed loop into the reversed buffer', () => {
    const wrap = playbackReadWrap(1000, 0.2, 0.8, 1, true, true, false)
    expect(wrap?.mode).toBe('loop')
    expect(wrap?.start).toBeCloseTo(200)
    expect(wrap?.end).toBeCloseTo(800)
    expect(playbackReadWrap(1000, 0, 1, 1, false, false, false)).toBeUndefined()
  })

  it('names three resampling qualities and a longer offline sinc', () => {
    expect(interpQuality('nearest', 'realtime')).toBe('fast')
    expect(interpQuality('linear', 'offline')).toBe('fast')
    expect(interpQuality('cubic', 'realtime')).toBe('smooth')
    expect(interpQuality('sinc', 'realtime')).toBe('high')
    expect(interpQuality('sinc', 'offline')).toBe('high')
    expect(sincLobes('realtime')).toBeLessThan(sincLobes('offline'))
    expect(interpKernelTaps('linear', 4, 'realtime')).toBe(2)
    expect(interpKernelTaps('cubic', 4, 'realtime')).toBe(4)
    expect(interpKernelTaps('sinc', 4, 'realtime')).toBeGreaterThan(interpKernelTaps('cubic', 4, 'realtime'))
    expect(interpKernelTaps('sinc', 4, 'offline')).toBeGreaterThan(interpKernelTaps('sinc', 4, 'realtime'))
    expect(interpKernelTaps('sinc', 4, 'realtime')).toBeGreaterThan(interpKernelTaps('sinc', 1, 'realtime'))
  })

  it('keeps a glided speed jump free of clicks on a steady tone', () => {
    const sr = 16000
    const src = new Float32Array(sr * 8).fill(0.75)
    const out = renderGlidedStretch(src, sr, sr, 62, 1, 4, 0, 'cubic', 'realtime')
    let maxJump = 0
    for (let i = 800; i < out.length - 800; i++) {
      maxJump = Math.max(maxJump, Math.abs((out[i + 1] ?? 0) - (out[i] ?? 0)))
    }
    expect(maxJump).toBeLessThan(0.08)
    const head = rms(out.subarray(400, 2000))
    const tail = rms(out.subarray(out.length - 2000, out.length - 400))
    expect(head).toBeGreaterThan(0.05)
    expect(tail).toBeGreaterThan(head * 0.7)
    expect(tail).toBeLessThan(head * 1.35)
  })

  it('plays slow, unity, and fast speeds at a steady level', () => {
    const sr = 16000
    const src = new Float32Array(sr * 8).fill(0.8)
    const levels: number[] = []
    for (const speed of [0.5, 1, 2]) {
      const out = renderGlidedStretch(src, Math.floor(sr * 0.7), sr, 62, speed, speed, 0, 'linear', 'realtime')
      const level = rms(out.subarray(Math.floor(sr * 0.12), out.length - 400))
      levels.push(level)
      expect(level).toBeGreaterThan(0.15)
    }
    expect(levels[0]).toBeGreaterThan((levels[1] ?? 0) * 0.7)
    expect(levels[2]).toBeGreaterThan((levels[1] ?? 0) * 0.7)
  })

  it('loops a selection without a silence hole at the seam', () => {
    const sr = 8000
    const src = sine(sr, sr, 220)
    const wrap = playbackReadWrap(sr, 0, 1, 1, false, true, false)
    const out = renderGlidedStretch(src, Math.floor(sr * 1.5), sr, 62, 1.4, 1.4, 0, 'linear', 'realtime', wrap)
    const seam = rms(out.subarray(sr - 200, sr + 200))
    const body = rms(out.subarray(400, 1200))
    expect(seam).toBeGreaterThan(body * 0.35)
  })

  it('spends fewer sinc taps in realtime than offline', () => {
    expect(sincLobes('realtime')).toBe(4)
    expect(sincLobes('offline')).toBe(8)
    expect(sincLobes('realtime')).toBeLessThan(sincLobes('offline'))
  })

  it('cubic and sinc reconstruct more 100 Hz than nearest when pitching down', () => {
    const sr = 48000
    const src = sine(sr, sr, 200)
    const nearest = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'nearest', 0)
    const cubic = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'cubic', 0)
    const sinc = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'sinc', 0)
    const n100 = goertzelMagnitude(nearest, sr, 100)
    expect(goertzelMagnitude(cubic, sr, 100)).toBeGreaterThan(n100 * 0.85)
    expect(goertzelMagnitude(sinc, sr, 100)).toBeGreaterThan(n100 * 0.85)
  })
})

function steady(samples: Float32Array): Float32Array {
  const from = Math.floor(samples.length * 0.3)
  const to = Math.floor(samples.length * 0.8)
  return samples.subarray(from, Math.max(from + 8, to))
}

function maxJump(samples: ArrayLike<number>): number {
  let jump = 0
  for (let i = 1; i < samples.length; i++) {
    jump = Math.max(jump, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)))
  }
  return jump
}

/** Broadband tone used to compare kernels without inventing extra distortion. */
function fullSpectrum(length: number, sr: number): Float32Array {
  const out = new Float32Array(length)
  const partials = [80, 220, 740, 2100, 6400]
  for (let i = 0; i < length; i++) {
    let s = 0
    for (const hz of partials) s += Math.sin((2 * Math.PI * hz * i) / sr)
    out[i] = s / partials.length
  }
  return out
}

describe('grain overlap at musical rates', () => {
  it('does not gap or click a steady tone at either end of the overlap range', () => {
    const sr = 16000
    const src = new Float32Array(sr * 3).fill(0.7)
    for (const overlap of [56, 76, 88]) {
      for (const speed of [0.25, 0.5, 1, 2, 4]) {
        const out = renderGlidedStretch(
          src,
          Math.floor(sr * 0.35),
          sr,
          overlap,
          speed,
          speed,
          0,
          'cubic',
          'realtime',
        )
        const body = steady(out)
        expect(rms(body)).toBeGreaterThan(0.08)
        expect(maxJump(body)).toBeLessThan(0.12)
      }
    }
  })
})

describe('interpolation at musical rates', () => {
  const speeds = [0.25, 0.5, 1, 2, 4] as const

  it('keeps sustained speech, percussion, bass, and full-spectrum tones audible at each speed', () => {
    const sr = 16000
    const hit = (i: number) => {
      const phase = (i % Math.floor(sr * 0.04)) / sr
      return Math.exp(-phase * 80) * Math.sin((2 * Math.PI * 180 * i) / sr)
    }
    const kinds = {
      speech: Float32Array.from({ length: sr * 2 }, (_, i) =>
        0.55 * Math.sin((2 * Math.PI * 180 * i) / sr) +
        0.3 * Math.sin((2 * Math.PI * 900 * i) / sr) +
        0.16 * Math.sin((2 * Math.PI * 2400 * i) / sr),
      ),
      perc: Float32Array.from({ length: sr * 2 }, (_, i) => hit(i)),
      bass: sine(sr * 2, sr, 55),
      full: fullSpectrum(sr * 2, sr),
    }
    for (const [kind, src] of Object.entries(kinds)) {
      for (const algo of ['linear', 'cubic', 'sinc'] as const) {
        const unity = rms(
          steady(
            renderGlidedStretch(src, Math.floor(sr * 0.35), sr, GRAIN_OVERLAP_DEFAULT, 1, 1, 0, algo, 'realtime'),
          ),
        )
        for (const speed of speeds) {
          const out = renderGlidedStretch(
            src,
            Math.floor(sr * 0.35),
            sr,
            GRAIN_OVERLAP_DEFAULT,
            speed,
            speed,
            0,
            algo,
            'realtime',
          )
          const body = steady(out)
          // Speed moves the read head between grains, so a periodic source can
          // sit several dB down from unity when overlapping grains disagree in
          // phase. That dip is the same for every kernel and is not a gap.
          expect(rms(body), `${kind} ${algo} speed ${speed}`).toBeGreaterThan(unity * 0.32)
          expect(maxJump(body), `${kind} ${algo} speed ${speed} jump`).toBeLessThan(1.25)
        }
      }
    }
  })

  it('separates fast, smooth, and high quality on a fractional bright read', () => {
    const sr = 48000
    const src = sine(sr, sr, 8000)
    const read = (algo: 'linear' | 'cubic' | 'sinc', step: number) => {
      const dest = new Float32Array(4000)
      resampleInto(dest, 4000, src, 10.3, step, algo, false, 1, 'realtime')
      return dest.subarray(200, 3800)
    }
    for (const step of [0.25, 0.5, 1, 2, 4]) {
      const linear = read('linear', step)
      const cubic = read('cubic', step)
      const sinc = read('sinc', step)
      expect(meanAbs(linear, cubic)).toBeGreaterThan(0.03)
      if (step < 4) expect(meanAbs(cubic, sinc)).toBeGreaterThan(0.008)
    }
    expect(rms(read('sinc', 4))).toBeLessThan(rms(read('linear', 4)) * 0.15)
  })

  it('drops the octave-up alias that fast and smooth both keep', () => {
    const sr = 48000
    const src = sine(sr, sr, 8000)
    const render = (algo: 'linear' | 'cubic' | 'sinc') =>
      overlapAddResample(src, sr, 4096, 1024, 1, pitchRatio(24), algo, 0, 'realtime').subarray(8000, 20000)
    const linear = render('linear')
    const cubic = render('cubic')
    const sinc = render('sinc')
    const alias = (samples: Float32Array) => goertzelMagnitude(samples, sr, 16000)
    expect(alias(linear)).toBeGreaterThan(0.05)
    expect(alias(sinc)).toBeLessThan(alias(linear) * 0.1)
    // Exact +24 st lands on whole samples, so the two cheap kernels match.
    // A non-octave pitch is what separates Fast from Smooth.
    expect(meanAbs(linear, cubic)).toBeLessThan(1e-6)
    const step = pitchRatio(7)
    const bright = sine(sr, sr, 5000)
    const fast = overlapAddResample(bright, Math.floor(sr * 0.4), 4096, 1024, 1, step, 'linear', 0, 'realtime')
    const smooth = overlapAddResample(bright, Math.floor(sr * 0.4), 4096, 1024, 1, step, 'cubic', 0, 'realtime')
    expect(meanAbs(fast.subarray(4000, 12000), smooth.subarray(4000, 12000))).toBeGreaterThan(0.005)
  })
})

function meanAbs(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length)
  let acc = 0
  for (let i = 0; i < n; i++) acc += Math.abs((a[i] ?? 0) - (b[i] ?? 0))
  return n > 0 ? acc / n : 0
}
