import { describe, expect, it } from 'vitest'
import { fillPinkNoise } from '../engine/pinkNoise'
import {
  bandAudibleGains,
  channelRms,
  clampCrossovers,
  decomposeComplementary,
  DEFAULT_CROSSOVERS_HZ,
  mixBandChannels,
  reconstructionError,
  spectrumListenId,
} from './bands'
import { convolveAligned, designLinearPhaseLowpass, fftRadix2 } from './fir'

const SR = 44100

function sine(freq: number, n: number, sr = SR, amp = 0.5, phase = 0): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr + phase)
  return out
}

function noise(n: number, seed = 1): Float32Array {
  const out = new Float32Array(n)
  let s = seed >>> 0 || 1
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    out[i] = (s / 0xffffffff) * 2 - 1
  }
  return out
}

function chirp(n: number, f0: number, f1: number, sr = SR): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1)
    const freq = f0 + (f1 - f0) * u
    out[i] = 0.4 * Math.sin((2 * Math.PI * freq * i) / sr)
  }
  return out
}

function unitySum(channel: Float32Array, sr = SR, crossovers: readonly number[] = DEFAULT_CROSSOVERS_HZ) {
  const split = decomposeComplementary([channel], sr, crossovers)
  const gains = split.bands.map(() => 1)
  const sum = mixBandChannels(split.bands, gains)[0]!
  return { split, sum, report: reconstructionError(channel, sum) }
}

describe('complementary spectral bands', () => {
  it('reconstructs an impulse with no delay', () => {
    const n = 4096
    const channel = new Float32Array(n)
    channel[1800] = 0.8
    const { split, report } = unitySum(channel)
    expect(split.bands).toHaveLength(4)
    expect(split.compensatedDelaySamples).toBeGreaterThan(0)
    expect(split.bands.every((band) => band[0]!.length === n)).toBe(true)
    expect(report.lag).toBe(0)
    expect(report.rmsDb).toBeLessThan(-90)
    expect(report.peakDb).toBeLessThan(-80)
    expect(Math.abs(report.gainDb)).toBeLessThan(0.05)
  })

  it('reconstructs a sine sitting on a crossover without cancellation', () => {
    const channel = sine(1000, 4096)
    const { report } = unitySum(channel)
    expect(report.lag).toBe(0)
    expect(report.rmsDb).toBeLessThan(-90)
    expect(Math.abs(report.gainDb)).toBeLessThan(0.05)
  })

  it('keeps every band time-aligned and a low sine in the sub/bass band', () => {
    const impulse = new Float32Array(4096)
    impulse[2000] = 1
    const splitImpulse = decomposeComplementary([impulse], SR, DEFAULT_CROSSOVERS_HZ)
    for (const band of splitImpulse.bands) {
      const data = band[0]!
      let weight = 0
      let moment = 0
      for (let i = 2000 - 800; i <= 2000 + 800; i++) {
        const mag = Math.abs(data[i] ?? 0)
        weight += mag
        moment += mag * i
      }
      expect(Math.abs(moment / weight - 2000)).toBeLessThan(1)
    }

    const channel = sine(60, 8192)
    const split = decomposeComplementary([channel], SR, DEFAULT_CROSSOVERS_HZ)
    const low = split.bands[0]![0]!
    const rest = channelRms(split.bands[1]![0]!) + channelRms(split.bands[2]![0]!) + channelRms(split.bands[3]![0]!)
    expect(channelRms(low)).toBeGreaterThan(rest * 4)
    let zero = 0
    let best = 0
    for (let lag = -4; lag <= 4; lag++) {
      let corr = 0
      for (let i = 1500; i < channel.length - 1500; i++) corr += (channel[i] ?? 0) * (low[i + lag] ?? 0)
      if (lag === 0) zero = corr
      if (corr > best) best = corr
    }
    expect(zero).toBeGreaterThan(best * 0.999)
  })

  it('sends highs to the top band and bass stacks to the bottom', () => {
    const high = sine(10000, 4096, SR, 0.4)
    const splitHigh = decomposeComplementary([high], SR, DEFAULT_CROSSOVERS_HZ)
    expect(channelRms(splitHigh.bands[3]![0]!)).toBeGreaterThan(channelRms(splitHigh.bands[0]![0]!) * 8)

    const bass = new Float32Array(8192)
    for (const freq of [50, 80, 110]) {
      const part = sine(freq, bass.length, SR, 0.2)
      for (let i = 0; i < bass.length; i++) bass[i] += part[i] ?? 0
    }
    const splitBass = decomposeComplementary([bass], SR, DEFAULT_CROSSOVERS_HZ)
    expect(channelRms(splitBass.bands[0]![0]!)).toBeGreaterThan(channelRms(splitBass.bands[3]![0]!) * 8)
    expect(unitySum(bass).report.rmsDb).toBeLessThan(-90)
  })

  it('reconstructs noise, a sweep, speech-like harmonics, and pink noise', () => {
    const sweep = chirp(8192, 30, 12000)
    const harmonics = new Float32Array(8192)
    for (const freq of [180, 360, 720, 1440, 2880, 5760]) {
      const part = sine(freq, harmonics.length, SR, 0.08)
      for (let i = 0; i < harmonics.length; i++) harmonics[i] += part[i] ?? 0
    }
    const pink = new Float32Array(8192)
    fillPinkNoise(pink, 7)
    for (const channel of [noise(8192, 3), sweep, harmonics, pink]) {
      const report = unitySum(channel).report
      expect(report.lag).toBe(0)
      expect(report.rmsDb).toBeLessThan(-90)
      expect(Math.abs(report.gainDb)).toBeLessThan(0.05)
    }
  })

  it('reconstructs stereo at 48 kHz', () => {
    const sr = 48000
    const left = noise(4096, 11)
    const right = sine(440, 4096, sr, 0.3, 0.4)
    const split = decomposeComplementary([left, right], sr, DEFAULT_CROSSOVERS_HZ)
    const sum = mixBandChannels(split.bands, [1, 1, 1, 1])
    expect(reconstructionError(left, sum[0]!).rmsDb).toBeLessThan(-90)
    expect(reconstructionError(right, sum[1]!).lag).toBe(0)
    expect(reconstructionError(right, sum[1]!).rmsDb).toBeLessThan(-90)
  })

  it('does not hardcode four bands in the splitter', () => {
    const channel = noise(4096, 19)
    const split = decomposeComplementary([channel], SR, [200, 2000])
    expect(split.bands).toHaveLength(3)
    const sum = mixBandChannels(split.bands, [1, 1, 1])[0]!
    expect(reconstructionError(channel, sum).rmsDb).toBeLessThan(-90)
  })

  it('applies mute, solo, and gain without touching the other bands', () => {
    expect(bandAudibleGains([
      { gainDb: 0, mute: false, solo: false },
      { gainDb: 6, mute: false, solo: false },
      { gainDb: 0, mute: true, solo: false },
      { gainDb: 0, mute: false, solo: true },
    ])).toEqual([0, 0, 0, 1])
    const quiet = bandAudibleGains([{ gainDb: -6, mute: false, solo: false }])
    expect(quiet[0]).toBeCloseTo(Math.pow(10, -6 / 20), 6)

    const channel = sine(60, 8192)
    const split = decomposeComplementary([channel], SR, DEFAULT_CROSSOVERS_HZ)
    const soloLow = mixBandChannels(split.bands, bandAudibleGains([
      { gainDb: 0, mute: false, solo: true },
      { gainDb: 0, mute: false, solo: false },
      { gainDb: 0, mute: false, solo: false },
      { gainDb: 0, mute: false, solo: false },
    ]))[0]!
    expect(channelRms(soloLow)).toBeGreaterThan(0.2)
    expect(reconstructionError(split.bands[0]![0]!, soloLow).rmsDb).toBeLessThan(-90)
  })

  it('keeps crossover order inside the usable range', () => {
    expect(clampCrossovers([120, 1000, 6000], SR)).toEqual([120, 1000, 6000])
    const ordered = clampCrossovers([9000, 40, 40], 44100)
    expect(ordered[0]).toBeLessThan(ordered[1]!)
    expect(ordered[1]).toBeLessThan(ordered[2]!)
    expect(ordered[2]!).toBeLessThan(44100 * 0.45 + 1)
  })
})

describe('spectrum listen target', () => {
  it('stays on the sum until a band is chosen', () => {
    expect(spectrumListenId(false, 'high')).toBeNull()
    expect(spectrumListenId(true, 'sum')).toBeNull()
    expect(spectrumListenId(true, 'high-mid')).toBe('high-mid')
  })
})

describe('linear-phase convolution', () => {
  it('matches direct and FFT convolution and passes DC', () => {
    const kernel = designLinearPhaseLowpass(1000, SR, 255)
    const sum = kernel.reduce((acc, v) => acc + v, 0)
    expect(sum).toBeCloseTo(1, 5)
    const signal = noise(3000, 4)
    const direct = convolveAligned(signal, kernel, (kernel.length - 1) >> 1, false)
    const fft = convolveAligned(signal, kernel, (kernel.length - 1) >> 1, true)
    let err = 0
    for (let i = 0; i < signal.length; i++) err = Math.max(err, Math.abs((direct[i] ?? 0) - (fft[i] ?? 0)))
    expect(err).toBeLessThan(1e-4)
  })

  it('round-trips an impulse through the FFT', () => {
    const n = 32
    const real = new Float64Array(n)
    const imag = new Float64Array(n)
    real[3] = 0.5
    real[7] = -0.25
    const copyR = Float64Array.from(real)
    const copyI = Float64Array.from(imag)
    fftRadix2(real, imag, false)
    fftRadix2(real, imag, true)
    for (let i = 0; i < n; i++) {
      expect(real[i]).toBeCloseTo(copyR[i]!, 8)
      expect(imag[i]).toBeCloseTo(copyI[i]!, 8)
    }
  })
})
