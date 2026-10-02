import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { defaultAutomation, ensureAutomationLane } from '../automation/automation'
import { factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import {
  defaultFxLfos,
  defaultLfoHold,
  modulateParam,
  parseFxLfos,
  type FxLfo,
  type FxLfoMap,
} from '../fx/lfo'
import { PARAMS, defaultParamValues } from '../parameters/definitions'
import { pitchRatio, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import type { Pcm } from '../samplePrep/types'
import { defaultCombFilter } from './comb'
import { defaultEqBands, type EqBand } from './eqBands'
import type { OfflineContextFactory, ProcessingSnapshot } from './offlineRender'
import { renderProcessedPcm } from './offlineRender'
import { eqHeardBandLists, modulatedEqBands, withEqBandCenters, type EqModClock } from './eqPerformance'
import { binFrequencyHz, timeDomainToDb, type SpectrumFftScratch } from './spectrumFft'

const SR = 22050

const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

function clock(lfoTimeSec: number, playing = false, transportSec = lfoTimeSec): EqModClock {
  return { transportSec, lfoTimeSec, playing, hold: defaultLfoHold() }
}

function lfo(patch: Partial<FxLfo> & Pick<FxLfo, 'target'>): FxLfo {
  return { rateHz: 1, shape: 'sine', depth: 80, phaseOriginSec: 0, ...patch }
}

function chain(enabled: ModuleType[]): ChainModule[] {
  const on = new Set(enabled)
  return factoryChain().map((mod) => ({
    ...mod,
    bypassed: mod.type !== 'gain' && mod.type !== 'output' && !on.has(mod.type),
  }))
}

function lowpass(hz: number, index = 0): EqBand[] {
  const bands = defaultEqBands()
  const current = bands[index] ?? bands[0]!
  bands[index] = { ...current, type: 'lowpass', frequency: hz, slope: 48, q: 0.707, gain: 0, bypassed: false }
  return bands
}

function state(
  patch: Partial<Omit<ProcessingSnapshot, 'params'>> & { params?: Partial<Record<ParamId, number>> } = {},
): ProcessingSnapshot {
  return {
    chain: patch.chain ?? chain(['eq']),
    params: { ...defaultParamValues(), gain: 0, outputGain: 0, ...patch.params },
    automation: patch.automation ?? defaultAutomation(),
    fxLfos: patch.fxLfos ?? defaultFxLfos(),
    eqById: patch.eqById ?? {},
    eqChannelMode: patch.eqChannelMode ?? 'shared',
    primaryEqId: patch.primaryEqId ?? 'eq-1',
    distortionType: patch.distortionType ?? 'clip',
    distortionNoiseKind: patch.distortionNoiseKind ?? 'white',
    delayType: patch.delayType ?? 'digital',
    reverbType: patch.reverbType ?? 'room',
    voiceGain: patch.voiceGain ?? 1,
    masterGain: patch.masterGain ?? 1,
    noiseMuted: patch.noiseMuted ?? false,
    noiseFadeTau: patch.noiseFadeTau ?? 0.012,
  }
}

function eqSnap(bands: EqBand[], lfos: FxLfoMap, params: Partial<Record<ParamId, number>> = {}, extra: Partial<ProcessingSnapshot> = {}) {
  return state({
    ...extra,
    params,
    fxLfos: lfos,
    eqById: {
      'eq-1': { bands, bandsL: extra.eqById?.['eq-1']?.bandsL ?? [], bandsR: extra.eqById?.['eq-1']?.bandsR ?? [], comb: defaultCombFilter() },
    },
  })
}

function noise(seconds: number, amp = 0.4): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  let seed = 0x1fee2e01
  for (let i = 0; i < n; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    ch[i] = ((seed / 0xffffffff) * 2 - 1) * amp
  }
  return { sampleRate: SR, channels: [ch] }
}

function sine(freq: number, seconds: number, amp = 0.5): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return { sampleRate: SR, channels: [ch] }
}

async function render(source: Pcm, snap: ProcessingSnapshot): Promise<Float32Array> {
  const pcm = await renderProcessedPcm(source, snap, { factory })
  return pcm.channels[0] ?? new Float32Array()
}

function meanAbs(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0))
  return n > 0 ? sum / n : 0
}

function highBandDb(samples: Float32Array, atSec: number): number {
  const fft = 2048
  const scratch: SpectrumFftScratch = { window: null, real: null, imag: null }
  const out = new Float32Array(fft / 2)
  const start = Math.max(0, Math.min(samples.length - fft, Math.floor(atSec * SR) - fft / 2))
  timeDomainToDb(samples.subarray(start, start + fft), out, scratch)
  let acc = 0
  let n = 0
  for (let i = 1; i < out.length; i++) {
    if (binFrequencyHz(i, fft, SR) < 4000) continue
    acc += out[i] ?? -120
    n++
  }
  return n ? acc / n : -120
}

function rms(samples: Float32Array, atSec: number, span = 0.08): number {
  const a = Math.max(0, Math.floor((atSec - span / 2) * SR))
  const b = Math.min(samples.length, Math.floor((atSec + span / 2) * SR))
  let sum = 0
  let n = 0
  for (let i = a; i < b; i++) {
    const x = samples[i] ?? 0
    sum += x * x
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

describe('EQ band centers', () => {
  it('keeps the band when the shadow parameter is stale and depth is zero', () => {
    const params = defaultParamValues()
    params.eq1Freq = 8000
    params.eq1Gain = 12
    params.eq1Q = 8
    const bands = defaultEqBands()
    bands[0] = { ...bands[0]!, frequency: 400, gain: 0, q: 1 }
    const centered = withEqBandCenters(params, bands)
    expect(centered.eq1Freq).toBe(400)
    expect(centered.eq1Gain).toBe(0)
    expect(centered.eq1Q).toBe(1)
    expect(params.eq1Freq).toBe(8000)
    const heard = modulatedEqBands(bands, params, defaultAutomation(), clock(0), defaultFxLfos())
    expect(heard.bands[0]?.frequency).toBe(400)
    expect(heard.bands[0]?.gain).toBe(0)
    expect(heard.bands[0]?.q).toBe(1)
  })

  it('modulates around the band, not the stale shadow', () => {
    const params = defaultParamValues()
    params.eq1Freq = 8000
    const bands = lowpass(400)
    const lfos = defaultFxLfos()
    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'square', depth: 50 })
    const heard = modulatedEqBands(bands, params, defaultAutomation(), clock(0.1), lfos)
    expect(heard.bands[0]?.frequency).toBeCloseTo(modulateParam(400, 'eq1Freq', 1, 50), 4)
    expect(heard.bands[0]?.frequency).not.toBeCloseTo(modulateParam(8000, 'eq1Freq', 1, 50), 0)
  })

  it('leaves bands past the shared registry on their stored values', () => {
    const bands = defaultEqBands()
    while (bands.length < 9) bands.push({ ...bands[0]!, frequency: 1000 + bands.length })
    bands[8] = { ...bands[8]!, frequency: 2222, gain: 4, q: 2 }
    const params = defaultParamValues()
    const heard = modulatedEqBands(bands, params, defaultAutomation(), clock(0.2), defaultFxLfos())
    expect(heard.bands[8]?.frequency).toBe(2222)
    expect(heard.bands[8]?.gain).toBe(4)
    expect(heard.bands[8]?.q).toBe(2)
  })
})

describe('EQ modulation evaluation', () => {
  it('swings frequency with rate, depth, and shape, and stops when removed', () => {
    const bands = lowpass(1000)
    const params = defaultParamValues()
    const lfos = defaultFxLfos()
    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'sine', depth: 40, rateHz: 1 })
    const up = modulatedEqBands(bands, params, defaultAutomation(), clock(0.25), lfos)
    expect(up.bands[0]?.frequency).toBeCloseTo(modulateParam(1000, 'eq1Freq', 1, 40), 3)

    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'sine', depth: 40, rateHz: 2 })
    const faster = modulatedEqBands(bands, params, defaultAutomation(), clock(0.25), lfos)
    expect(faster.bands[0]?.frequency).toBeCloseTo(1000, 3)
    expect(faster.bands[0]?.frequency).not.toBeCloseTo(up.bands[0]!.frequency, 0)

    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'square', depth: 40, rateHz: 1 })
    const square = modulatedEqBands(bands, params, defaultAutomation(), clock(0.1), lfos)
    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'sine', depth: 40, rateHz: 1 })
    const sine = modulatedEqBands(bands, params, defaultAutomation(), clock(0.1), lfos)
    expect(square.bands[0]?.frequency).not.toBeCloseTo(sine.bands[0]!.frequency, 0)

    lfos.eq1[0] = lfo({ target: 'eq1Freq', depth: 0 })
    expect(modulatedEqBands(bands, params, defaultAutomation(), clock(0.25), lfos).bands[0]?.frequency).toBe(1000)

    lfos.eq1[0] = lfo({ target: null, depth: 80 })
    expect(modulatedEqBands(bands, params, defaultAutomation(), clock(0.25), lfos).bands[0]?.frequency).toBe(1000)
  })

  it('offsets the LFO around the automated center while playing and the band while stopped', () => {
    const bands = lowpass(400)
    const params = defaultParamValues()
    const normalized = toNormalized(5000, PARAMS.eq1Freq)
    const automation = ensureAutomationLane(defaultAutomation(), 'eq1Freq', normalized, 4)
    const lfos = defaultFxLfos()
    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'square', depth: 30 })
    const playing = modulatedEqBands(bands, params, automation, clock(0.1, true, 1), lfos)
    const stopped = modulatedEqBands(bands, params, automation, clock(0.1, false, 1), lfos)
    expect(playing.bands[0]?.frequency).toBeCloseTo(modulateParam(5000, 'eq1Freq', 1, 30), 2)
    expect(stopped.bands[0]?.frequency).toBeCloseTo(modulateParam(400, 'eq1Freq', 1, 30), 2)
  })

  it('routes each destination independently, including left and right bands', () => {
    const bands = defaultEqBands()
    bands[0] = { ...bands[0]!, type: 'peaking', frequency: 800, gain: 3, q: 1, bypassed: false }
    bands[1] = { ...bands[1]!, type: 'peaking', frequency: 2000, gain: -2, q: 1.4, bypassed: false }
    const params = defaultParamValues()
    params.delayWet = 40
    const lfos = defaultFxLfos()
    lfos.eq1[0] = lfo({ target: 'eq1Freq', shape: 'square', depth: 40 })
    lfos.eq2[0] = lfo({ target: 'eq2Gain', shape: 'square', depth: 50 })
    lfos.delay[0] = lfo({ target: 'delayWet', shape: 'square', depth: 30 })
    const heard = modulatedEqBands(bands, params, defaultAutomation(), clock(0.1), lfos)
    expect(heard.bands[0]?.frequency).toBeCloseTo(modulateParam(800, 'eq1Freq', 1, 40), 3)
    expect(heard.bands[0]?.gain).toBe(3)
    expect(heard.bands[1]?.frequency).toBe(2000)
    expect(heard.bands[1]?.gain).toBeCloseTo(modulateParam(-2, 'eq2Gain', 1, 50), 3)
    expect(heard.live.delayWet).toBeCloseTo(modulateParam(40, 'delayWet', 1, 30), 3)

    const left = lowpass(400)
    const right = lowpass(4000)
    const shared = lowpass(100)
    const heardSides = eqHeardBandLists('left', shared, left, right)
    const leftOut = modulatedEqBands(heardSides.left, params, defaultAutomation(), clock(0.1), lfos)
    const rightOut = modulatedEqBands(heardSides.right, params, defaultAutomation(), clock(0.1), lfos)
    expect(leftOut.bands[0]?.frequency).toBeCloseTo(modulateParam(400, 'eq1Freq', 1, 40), 3)
    expect(rightOut.bands[0]?.frequency).toBeCloseTo(modulateParam(4000, 'eq1Freq', 1, 40), 3)
  })

  it('restores a saved LFO onto the band center', () => {
    const lfos = parseFxLfos({
      eq1: [{ rateHz: 2, shape: 'triangle', depth: 55, target: 'eq1Freq' }],
    })
    const bands = lowpass(900)
    const heard = modulatedEqBands(bands, defaultParamValues(), defaultAutomation(), clock(0.125), lfos)
    expect(heard.bands[0]?.frequency).not.toBe(900)
    expect(Number.isFinite(heard.bands[0]?.frequency)).toBe(true)
  })

  it('keeps every mapping type finite inside its range at both rails', () => {
    const cases: { id: ParamId; low: number; high: number }[] = [
      { id: 'eq1Freq', low: 10, high: 25000 },
      { id: 'filterCutoff', low: 20, high: 20000 },
      { id: 'eq1Gain', low: -18, high: 18 },
      { id: 'eq1Q', low: 0.1, high: 20 },
      { id: 'delayWet', low: 0, high: 100 },
      { id: 'pan', low: -100, high: 100 },
      { id: 'pitch', low: -48, high: 48 },
      { id: 'delayTime', low: 1, high: 10000 },
    ]
    for (const item of cases) {
      for (const center of [item.low, item.high, (item.low + item.high) / 2]) {
        for (const wave of [-1, 0, 1]) {
          const value = modulateParam(center, item.id, wave, 100)
          expect(Number.isFinite(value)).toBe(true)
          expect(value).toBeGreaterThanOrEqual(PARAMS[item.id].min - 1e-6)
          expect(value).toBeLessThanOrEqual(PARAMS[item.id].max + 1e-6)
        }
      }
    }
    const pitched = modulateParam(0, 'pitch', 1, 40)
    expect(pitched).not.toBe(0)
    expect(pitchRatio(pitched)).not.toBeCloseTo(1, 2)
  })
})

describe('EQ modulation audio', () => {
  it('moves a lowpass with the frequency LFO and ignores a stale shadow at depth 0', async () => {
    const src = noise(1.2)
    const lfos = defaultFxLfos()
    lfos.eq1[0] = lfo({ target: 'eq1Freq', depth: 80, rateHz: 1, shape: 'sine' })
    const swept = await render(src, eqSnap(lowpass(800), lfos, { eq1Freq: 8000, eq1Q: 0.707 }))
    expect(highBandDb(swept, 0.25)).toBeGreaterThan(highBandDb(swept, 0.75) + 6)

    const stale = await render(src, eqSnap(lowpass(800), defaultFxLfos(), { eq1Freq: 8000, eq1Q: 0.707 }))
    const open = await render(src, eqSnap(lowpass(8000), defaultFxLfos(), { eq1Freq: 800, eq1Q: 0.707 }))
    expect(highBandDb(stale, 0.3)).toBeLessThan(highBandDb(open, 0.3) - 12)
  })

  it('makes bell frequency, gain, and Q audible, and follows rate, depth, and shape', async () => {
    const src = noise(1)
    const bell = defaultEqBands()
    bell[0] = { ...bell[0]!, type: 'peaking', frequency: 1800, gain: 12, q: 4, bypassed: false }
    const freq = defaultFxLfos()
    freq.eq1[0] = lfo({ target: 'eq1Freq', depth: 80, rateHz: 1 })
    const moving = await render(src, eqSnap(bell, freq))
    const still = await render(src, eqSnap(bell, defaultFxLfos()))
    expect(meanAbs(moving, still)).toBeGreaterThan(0.01)

    const gainLfo = defaultFxLfos()
    gainLfo.eq1[0] = lfo({ target: 'eq1Gain', shape: 'square', depth: 80, rateHz: 1 })
    const gained = await render(sine(1800, 1, 0.35), eqSnap(bell, gainLfo))
    expect(Math.abs(rms(gained, 0.15) - rms(gained, 0.65))).toBeGreaterThan(0.02)

    const qLfo = defaultFxLfos()
    qLfo.eq1[0] = lfo({ target: 'eq1Q', shape: 'sine', depth: 70, rateHz: 1 })
    const widened = await render(src, eqSnap(bell, qLfo))
    expect(meanAbs(widened, still)).toBeGreaterThan(0.005)

    const slow = defaultFxLfos()
    slow.eq1[0] = lfo({ target: 'eq1Freq', depth: 80, rateHz: 0.5, shape: 'sine' })
    const fast = defaultFxLfos()
    fast.eq1[0] = lfo({ target: 'eq1Freq', depth: 80, rateHz: 4, shape: 'sine' })
    const square = defaultFxLfos()
    square.eq1[0] = lfo({ target: 'eq1Freq', depth: 80, rateHz: 1, shape: 'square' })
    const slowPcm = await render(src, eqSnap(lowpass(800), slow))
    const fastPcm = await render(src, eqSnap(lowpass(800), fast))
    const squarePcm = await render(src, eqSnap(lowpass(800), square))
    const sinePcm = await render(src, eqSnap(lowpass(800), freq))
    expect(meanAbs(slowPcm, fastPcm)).toBeGreaterThan(0.01)
    expect(meanAbs(squarePcm, sinePcm)).toBeGreaterThan(0.01)

    const shallow = defaultFxLfos()
    shallow.eq1[0] = lfo({ target: 'eq1Freq', depth: 0, rateHz: 1 })
    const zero = await render(src, eqSnap(lowpass(800), shallow))
    const none = await render(src, eqSnap(lowpass(800), defaultFxLfos()))
    expect(meanAbs(zero, none)).toBeLessThan(0.002)
  })

  it('reaches filter cutoff, gain, delay time, and delay wet', async () => {
    const src = noise(1)
    const cutoff = defaultFxLfos()
    cutoff.filter[0] = lfo({ target: 'filterCutoff', depth: 70, rateHz: 1, shape: 'sine' })
    const filtered = await render(
      src,
      state({
        chain: chain(['filter']),
        fxLfos: cutoff,
        params: { filterCutoff: 900, filterKind: 0, filterMix: 100, filterSlope: 2, filterDrive: 0, filterReso: 0.7 },
      }),
    )
    expect(highBandDb(filtered, 0.25)).toBeGreaterThan(highBandDb(filtered, 0.75) + 3)

    const level = defaultFxLfos()
    level.input[0] = lfo({ target: 'gain', shape: 'square', depth: 60, rateHz: 1 })
    const gained = await render(sine(440, 1, 0.3), state({ chain: chain([]), fxLfos: level, params: { gain: 0 } }))
    expect(Math.abs(rms(gained, 0.15) - rms(gained, 0.65))).toBeGreaterThan(0.02)

    const burst = sine(180, 0.04, 0.8)
    const pad = new Float32Array(Math.floor(0.8 * SR))
    pad.set(burst.channels[0] ?? new Float32Array())
    const hit = { sampleRate: SR, channels: [pad] }
    const timeLfo = defaultFxLfos()
    timeLfo.delay[0] = lfo({ target: 'delayTime', depth: 70, rateHz: 1, shape: 'sine' })
    const delayed = await render(
      hit,
      state({
        chain: chain(['delay']),
        fxLfos: timeLfo,
        params: { delayWet: 70, delayTime: 220, delayFeedback: 0 },
      }),
    )
    const staticDelay = await render(
      hit,
      state({
        chain: chain(['delay']),
        params: { delayWet: 70, delayTime: 220, delayFeedback: 0 },
      }),
    )
    expect(meanAbs(delayed, staticDelay)).toBeGreaterThan(0.005)

    const wetLfo = defaultFxLfos()
    wetLfo.delay[0] = lfo({ target: 'delayWet', shape: 'square', depth: 80, rateHz: 1 })
    const wet = await render(
      hit,
      state({
        chain: chain(['delay']),
        fxLfos: wetLfo,
        params: { delayWet: 40, delayTime: 160, delayFeedback: 10 },
      }),
    )
    const wetStill = await render(
      hit,
      state({
        chain: chain(['delay']),
        params: { delayWet: 40, delayTime: 160, delayFeedback: 10 },
      }),
    )
    expect(meanAbs(wet, wetStill)).toBeGreaterThan(0.005)

    const n = Math.floor(0.8 * SR)
    const left = new Float32Array(n)
    const right = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      left[i] = 0.45 * Math.sin((2 * Math.PI * 180 * i) / SR)
      right[i] = 0.45 * Math.sin((2 * Math.PI * 2400 * i) / SR)
    }
    const panLfo = defaultFxLfos()
    panLfo.input[0] = lfo({ target: 'pan', shape: 'square', depth: 90, rateHz: 1 })
    const panned = await renderProcessedPcm(
      { sampleRate: SR, channels: [left, right] },
      state({ chain: chain([]), fxLfos: panLfo, params: { pan: 0 } }),
      { factory },
    )
    const panLeft = panned.channels[0] ?? new Float32Array()
    expect(Math.abs(rms(panLeft, 0.15) - rms(panLeft, 0.65))).toBeGreaterThan(0.02)
  })
})
