import { describe, expect, it } from 'vitest'
import { capSpectrumBins, bandPeakDb, followBandsOverTime, logBandEdgesHz, spectrumFallBallistics } from './spectrumBands'
import { applyBiquad, eqMagnitudeDb } from './eqResponse'
import { defaultEqBandAt, type EqBand, type EqFilterType } from './eqBands'
import { hzToX, xToHz, type FreqScaleKind } from './freqScale'
import { midiToHz, musicalScaleHz } from './pitchScale'
import { spectrumLayerTaps } from './spectrumPrefs'
import { writeSpectrumCurve } from './spectrumEnvelope'
import { spectrumFftSizeForBands, SPECTRUM_CAPTURE_FFT } from './analyserBudget'
import {
  blackmanWindow,
  binFrequencyHz,
  dominantBin,
  measureSpectrumDb,
  SPECTRUM_ANALYSIS_FFT,
  type SpectrumFftScratch,
} from './spectrumFft'

const SR = 40960
const FFT = SPECTRUM_ANALYSIS_FFT
const BINS = FFT / 2
const BIN_HZ = SR / FFT

function scratch(): SpectrumFftScratch {
  return { window: null, real: null, imag: null }
}

function analyze(time: ArrayLike<number>): Float32Array {
  const out = new Float32Array(BINS)
  measureSpectrumDb(time, out, scratch())
  return out
}

function sine(freq: number, n: number, amp: number): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return out
}

function addSine(into: Float32Array, freq: number, amp: number): void {
  for (let i = 0; i < into.length; i++) into[i] = (into[i] ?? 0) + amp * Math.sin((2 * Math.PI * freq * i) / SR)
}

function band(type: EqFilterType, frequency: number, q: number, gain: number): EqBand {
  return { ...defaultEqBandAt(0), type, frequency, q, gain, slope: 12, bypassed: false }
}

function filterTail(type: EqFilterType, frequency: number, q: number, gain: number, input: Float32Array): Float32Array {
  const filtered = new Float32Array(input.length)
  applyBiquad(type, frequency, q, gain, SR, input, filtered)
  return filtered.subarray(filtered.length - SPECTRUM_CAPTURE_FFT)
}

function levelNear(bins: Float32Array, hz: number): number {
  const center = Math.round(hz / BIN_HZ)
  let best = -200
  for (let i = center - 1; i <= center + 1; i++) {
    if (i > 0 && i < bins.length) best = Math.max(best, bins[i] ?? -200)
  }
  return best
}

/** Direct DFT at one bin, same Blackman and coherent-gain normalization as the analyzer. */
function referenceBinDb(time: ArrayLike<number>, bin: number): number {
  const n = time.length
  const window = blackmanWindow(n)
  let sum = 0
  let re = 0
  let im = 0
  const ang = (-2 * Math.PI * bin) / n
  for (let i = 0; i < n; i++) {
    const w = window[i] ?? 0
    sum += w
    const x = (time[i] ?? 0) * w
    re += x * Math.cos(ang * i)
    im += x * Math.sin(ang * i)
  }
  const mag = Math.hypot(re, im) * (sum > 1e-12 ? 2 / sum : 1)
  return mag > 1e-10 ? 20 * Math.log10(mag) : -100
}

function partials(): Float32Array {
  const mix = new Float32Array(SR)
  addSine(mix, 100, 0.5)
  addSine(mix, 500, 0.25)
  addSine(mix, 1000, 0.125)
  addSine(mix, 5000, 0.0625)
  return mix
}

describe('spectrum signal path', () => {
  it('maps Before / After / Both onto the chain-input and output taps', () => {
    expect(spectrumLayerTaps('pre')).toEqual(['pre'])
    expect(spectrumLayerTaps('post')).toEqual(['post'])
    expect(spectrumLayerTaps('both')).toEqual(['pre', 'post'])
    expect(spectrumLayerTaps('post').join(',')).not.toContain('eq')
  })

  it('does not change the FFT size when the display band count changes', () => {
    expect(spectrumFftSizeForBands(32)).toBe(SPECTRUM_CAPTURE_FFT)
    expect(spectrumFftSizeForBands(1024)).toBe(spectrumFftSizeForBands(32))
  })
})

describe('sine peaks', () => {
  it.each([100, 1000, 5000])('places a %i Hz sine on that bin', (hz) => {
    const bins = analyze(sine(hz, SPECTRUM_CAPTURE_FFT, 0.5))
    const bin = dominantBin(bins)
    expect(Math.abs(binFrequencyHz(bin, FFT, SR) - hz)).toBeLessThanOrEqual(BIN_HZ)
    expect(bins[bin]!).toBeGreaterThan(20 * Math.log10(0.5) - 1.5)
    expect(bins[bin]!).toBeLessThan(20 * Math.log10(0.5) + 1.5)
  })
})

describe('multi-tone', () => {
  it('shows every partial at its frequency and relative level', () => {
    const bins = analyze(partials().subarray(partials().length - SPECTRUM_CAPTURE_FFT))
    const tones = [
      { hz: 100, amp: 0.5 },
      { hz: 500, amp: 0.25 },
      { hz: 1000, amp: 0.125 },
      { hz: 5000, amp: 0.0625 },
    ]
    const ref = 20 * Math.log10(tones[0]!.amp)
    for (const tone of tones) {
      const db = levelNear(bins, tone.hz)
      const want = 20 * Math.log10(tone.amp)
      expect(Math.abs(binFrequencyHz(Math.round(tone.hz / BIN_HZ), FFT, SR) - tone.hz)).toBeLessThan(0.01)
      expect(db).toBeGreaterThan(want - 1.5)
      expect(db).toBeLessThan(want + 1.5)
      expect(db - levelNear(bins, tones[0]!.hz)).toBeCloseTo(want - ref, 0)
    }
  })
})

describe('impulse', () => {
  it('shows broadband energy, including when the click is off the first window edge', () => {
    const centered = new Float32Array(SPECTRUM_CAPTURE_FFT)
    centered[1024] = 1
    const bins = analyze(centered)
    let lo = Infinity
    let hi = -Infinity
    for (let i = 4; i < bins.length - 4; i++) {
      const db = bins[i] ?? -100
      lo = Math.min(lo, db)
      hi = Math.max(hi, db)
    }
    expect(hi).toBeGreaterThan(-58)
    expect(hi - lo).toBeLessThan(2)

    const offset = new Float32Array(SPECTRUM_CAPTURE_FFT)
    offset[1024 + 256] = 1
    const shifted = analyze(offset)
    expect(levelNear(shifted, 4000)).toBeGreaterThan(levelNear(bins, 4000) - 4)
  })
})

describe('filtered impulse and tones track the samples', () => {
  it('matches an independent DFT of the post-filter samples', () => {
    const dry = partials()
    const tail = filterTail('highpass', 500, Math.SQRT1_2, 0, dry)
    const bins = analyze(tail)
    const window = tail.subarray(0, FFT)
    for (const hz of [100, 500, 1000, 5000]) {
      const bin = Math.round(hz / BIN_HZ)
      expect(Math.abs((bins[bin] ?? -100) - referenceBinDb(window, bin))).toBeLessThan(0.2)
    }
  })

  it('keeps the same measurement for a low high-pass and a 500 Hz high-pass in the passband', () => {
    const dry = partials()
    const low = analyze(filterTail('highpass', 80, Math.SQRT1_2, 0, dry))
    const mid = analyze(filterTail('highpass', 500, Math.SQRT1_2, 0, dry))
    const high = analyze(filterTail('highpass', 4000, Math.SQRT1_2, 0, dry))
    expect(Math.abs(levelNear(low, 5000) - levelNear(mid, 5000))).toBeLessThan(3)
    expect(levelNear(low, 5000)).toBeGreaterThan(-30)
    expect(levelNear(mid, 5000)).toBeGreaterThan(-30)
    expect(levelNear(high, 100)).toBeLessThan(levelNear(low, 100) - 20)
    expect(levelNear(mid, 100)).toBeLessThan(levelNear(low, 100) - 6)
  })

  it('follows high-pass, low-pass, and bell magnitude on steady tones', () => {
    const q = Math.SQRT1_2
    const cases: { type: EqFilterType; cutoff: number; gain: number; q: number; hz: number }[] = [
      { type: 'highpass', cutoff: 80, gain: 0, q, hz: 5000 },
      { type: 'highpass', cutoff: 500, gain: 0, q, hz: 100 },
      { type: 'highpass', cutoff: 500, gain: 0, q, hz: 5000 },
      { type: 'highpass', cutoff: 2000, gain: 0, q, hz: 100 },
      { type: 'lowpass', cutoff: 500, gain: 0, q, hz: 100 },
      { type: 'lowpass', cutoff: 500, gain: 0, q, hz: 5000 },
      { type: 'peaking', cutoff: 1000, gain: 12, q: 4, hz: 1000 },
      { type: 'peaking', cutoff: 1000, gain: 12, q: 4, hz: 100 },
    ]
    for (const item of cases) {
      const dry = sine(item.hz, SR, 0.4)
      const wet = filterTail(item.type, item.cutoff, item.q, item.gain, dry)
      const delta = levelNear(analyze(wet), item.hz) - levelNear(analyze(dry.subarray(dry.length - SPECTRUM_CAPTURE_FFT)), item.hz)
      const want = eqMagnitudeDb([band(item.type, item.cutoff, item.q, item.gain)], item.hz, SR)
      expect(delta).toBeCloseTo(want, 0)
    }
  })

  it('does not ceiling a measured click with a silent pre-tap response', () => {
    const impulse = new Float32Array(SPECTRUM_CAPTURE_FFT)
    impulse[1024] = 1
    const measured = analyze(impulse)
    const pre = new Float32Array(measured.length).fill(-100)
    const capped = Float32Array.from(measured)
    capSpectrumBins(capped, pre, SR, () => 0)
    expect(measured[250]!).toBeGreaterThan(-60)
    expect(capped[250]!).toBeLessThan(-90)
  })
})

describe('bars, line, and frequency axis', () => {
  it('puts the bar peak and the line peak on the same sine', () => {
    const hz = 1000
    const bins = analyze(sine(hz, FFT, 0.5))
    const minHz = 20
    const maxHz = 20000
    const bands = bandPeakDb(bins, SR, 64, minHz, maxHz)
    const edges = logBandEdgesHz(minHz, maxHz, bands.length)
    let bandIndex = 0
    for (let i = 1; i < bands.length; i++) if ((bands[i] ?? -100) > (bands[bandIndex] ?? -100)) bandIndex = i
    const bandHz = Math.sqrt((edges[bandIndex] ?? hz) * (edges[bandIndex + 1] ?? hz))
    expect(Math.abs(bandHz - hz)).toBeLessThan(hz * 0.2)

    const plot = { left: 0, right: 1000, top: 0, bottom: 100 }
    for (const scale of ['log', 'linear', 'mel'] as const satisfies readonly FreqScaleKind[]) {
      const xy = new Float32Array(512 * 2)
      const count = writeSpectrumCurve(bins, SR, minHz, maxHz, plot, xy, 0, -100, 0, scale, 256)
      let best = 0
      for (let i = 1; i < count; i++) if ((xy[i * 2 + 1] ?? 0) < (xy[best * 2 + 1] ?? 0)) best = i
      const peakHz = xToHz(xy[best * 2] ?? 0, minHz, maxHz, plot.left, plot.right, scale)
      expect(Math.abs(peakHz - hz)).toBeLessThan(BIN_HZ * 2)
    }
  })

  it('keeps quiet bins when another bin is much louder', () => {
    const bins = new Float32Array(BINS).fill(-80)
    bins[Math.round(1000 / BIN_HZ)] = -6
    const minHz = 20
    const maxHz = 20000
    const bands = bandPeakDb(bins, SR, 32, minHz, maxHz)
    const edges = logBandEdgesHz(minHz, maxHz, bands.length)
    let quiet = -100
    for (let i = 0; i < bands.length; i++) {
      const lo = edges[i] ?? minHz
      const hi = edges[i + 1] ?? maxHz
      if (100 >= lo && 100 < hi) quiet = bands[i] ?? -100
    }
    expect(Math.max(...bands)).toBeCloseTo(-6)
    expect(quiet).toBeGreaterThan(-90)
    expect(quiet).toBeLessThan(-70)
  })

  it('aggregates a display band to the peak bin inside it', () => {
    const bins = new Float32Array(BINS).fill(-90)
    const bin = Math.round(1000 / BIN_HZ)
    bins[bin] = -28
    bins[bin + 1] = -9
    const bands = bandPeakDb(bins, SR, 24, 20, 20000)
    expect(Math.max(...bands)).toBeCloseTo(-9)
  })

  it('maps 100 Hz through 10 kHz and the C labels on one axis', () => {
    const marks = [100, 500, 1000, 5000, 10000]
    for (const scale of ['log', 'linear', 'mel'] as const) {
      const xs = marks.map((hz) => hzToX(hz, 20, 20000, 0, 1000, scale))
      for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!)
      for (let i = 0; i < marks.length; i++) {
        expect(xToHz(xs[i]!, 20, 20000, 0, 1000, scale)).toBeCloseTo(marks[i]!, 3)
      }
    }
    const notes = musicalScaleHz(20, 20000)
    const expected: Record<string, number> = {
      C1: midiToHz(24),
      C2: midiToHz(36),
      C3: midiToHz(48),
      C4: midiToHz(60),
      C5: midiToHz(72),
      C6: midiToHz(84),
    }
    for (const [label, hz] of Object.entries(expected)) {
      const note = notes.find((item) => item.label === label)
      expect(note?.hz).toBeCloseTo(hz, 4)
      const x = hzToX(hz, 20, 20000, 0, 1000, 'log')
      expect(xToHz(x, 20, 20000, 0, 1000, 'log')).toBeCloseTo(hz, 4)
      expect(hzToX(note!.hz, 20, 20000, 0, 1000, 'log')).toBeCloseTo(x, 4)
    }
  })
})

describe('silence', () => {
  it('stays on the floor and then falls there after a tone', () => {
    const bins = analyze(new Float32Array(SPECTRUM_CAPTURE_FFT))
    expect(Math.max(...bins)).toBeLessThanOrEqual(-100)
    const held = new Float32Array([-6])
    const floor = new Float32Array([-100])
    const release = spectrumFallBallistics('fast').peak.release
    const attack = spectrumFallBallistics('fast').peak.attack
    for (let i = 0; i < 30; i++) followBandsOverTime(held, floor, attack, release, 1 / 60)
    expect(held[0]!).toBeLessThan(-40)
    expect(Number.isFinite(held[0]!)).toBe(true)
  })
})
