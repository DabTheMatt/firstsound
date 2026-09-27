import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { defaultAutomation, type AutomationDocument } from '../automation/automation'
import { defaultChain, factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import { defaultFxLfos, type FxLfoMap } from '../fx/lfo'
import { PARAMS, defaultParamValues } from '../parameters/definitions'
import { dbToGain, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { defaultPrep } from '../samplePrep/state'
import type { ExportSettings, Pcm } from '../samplePrep/types'
import { defaultCombFilter } from './comb'
import { prepForWorkingExport, selectionExportAvailable } from './exportTail'
import { defaultEqBands, type EqBand } from './eqBands'
import type { OfflineContextFactory, ProcessingSnapshot } from './offlineRender'
import { renderExportPcm, renderProcessedPcm } from './offlineRender'
import { binFrequencyHz, timeDomainToDb, type SpectrumFftScratch } from './spectrumFft'
import { snapshotFromEngine, mapSensoryToDsp } from '../../sensory/mapping/mappingEngine'
import { applyColorSound } from '../../sensory/colorSound'
import { defaultSensoryValues, patchSensoryValue } from '../../sensory/sensoryState'

const SR = 22050

const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

function sine(freq: number, seconds: number, amp = 0.65): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return { sampleRate: SR, channels: [ch] }
}

function burst(seconds: number, burstSec = 0.03, amp = 0.8, freq = 440): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const m = Math.min(n, Math.floor(burstSec * SR))
  const ch = new Float32Array(n)
  for (let i = 0; i < m; i++) ch[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return { sampleRate: SR, channels: [ch] }
}

function chain(enabled: ModuleType[]): ChainModule[] {
  const on = new Set(enabled)
  return factoryChain().map((mod) => ({
    ...mod,
    bypassed: mod.type !== 'gain' && mod.type !== 'output' && !on.has(mod.type),
  }))
}

function lowpassBands(hz: number): EqBand[] {
  const bands = defaultEqBands()
  bands[0] = { ...bands[0]!, type: 'lowpass', frequency: hz, slope: 48, q: 0.707, bypassed: false }
  return bands
}

function state(
  patch: Partial<Omit<ProcessingSnapshot, 'params'>> & { params?: Partial<Record<ParamId, number>> } = {},
): ProcessingSnapshot {
  const params = { ...defaultParamValues(), gain: 0, outputGain: 0, ...patch.params }
  return {
    chain: patch.chain ?? defaultChain(),
    params,
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

function eqState(hz: number): ProcessingSnapshot {
  return state({
    chain: chain(['eq']),
    params: { eq1Freq: hz, eq1Q: 0.707 },
    eqById: {
      'eq-1': { bands: lowpassBands(hz), bandsL: [], bandsR: [], comb: defaultCombFilter() },
    },
  })
}

const settings = (scope: 'project' | 'selection' = 'project', normalize = false): ExportSettings => ({
  name: 'test',
  sampleRate: 'original',
  bitDepth: 32,
  applyFades: false,
  applyGain: false,
  applyReverse: false,
  applyNormalize: normalize,
  scope,
})

async function render(source: Pcm, snap: ProcessingSnapshot): Promise<Pcm> {
  return renderProcessedPcm(source, snap, { factory })
}

function mono(pcm: Pcm): Float32Array {
  return pcm.channels[0] ?? new Float32Array()
}

function rms(ch: Float32Array, start = 0, end = ch.length): number {
  const a = Math.max(0, start)
  const b = Math.min(ch.length, end)
  let sum = 0
  let n = 0
  for (let i = a; i < b; i++) {
    const x = ch[i] ?? 0
    sum += x * x
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
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

function sampleDelta(samples: Float32Array, atSec: number, spanSec = 0.03): number {
  const a = Math.max(1, Math.floor((atSec - spanSec) * SR))
  const b = Math.min(samples.length, Math.floor((atSec + spanSec) * SR))
  let max = 0
  for (let i = a; i < b; i++) max = Math.max(max, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)))
  return max
}

function stepped(src: Float32Array, atSec: number, from: number, to: number): Float32Array {
  const out = new Float32Array(src.length)
  const at = Math.floor(atSec * SR)
  for (let i = 0; i < src.length; i++) out[i] = (src[i] ?? 0) * (i < at ? from : to)
  return out
}

function peak(ch: Float32Array, start = 0, end = ch.length): number {
  let m = 0
  for (let i = start; i < Math.min(ch.length, end); i++) m = Math.max(m, Math.abs(ch[i] ?? 0))
  return m
}

/** Share of energy above ~900 Hz. Distortion after a lowpass raises this. */
function highShare(ch: Float32Array): number {
  const a = Math.exp((-2 * Math.PI * 900) / SR)
  let prev = 0
  let y = 0
  let hp = 0
  let tot = 0
  for (let i = 0; i < ch.length; i++) {
    const x = ch[i] ?? 0
    y = a * (y + x - prev)
    prev = x
    hp += y * y
    tot += x * x
  }
  return hp / Math.max(1e-12, tot)
}

function lane(paramId: ParamId, from: number, to: number, t0: number, t1: number): AutomationDocument {
  const def = PARAMS[paramId]
  return {
    selectedParamId: paramId,
    lanes: [
      {
        paramId,
        nodes: [
          { id: 'a', time: t0, value: toNormalized(from, def) },
          { id: 'b', time: t1, value: toNormalized(to, def) },
        ],
      },
    ],
  }
}

function ordered(types: ModuleType[]): ChainModule[] {
  const base = factoryChain()
  return types.map((type) => {
    const found = base.find((mod) => mod.type === type)
    if (!found) throw new Error(`missing ${type}`)
    return { ...found, bypassed: false }
  })
}

describe('offline export renders the audible chain', () => {
  it('matches the source when processing is bypassed and gains are unity', async () => {
    const source = sine(440, 0.25, 0.5)
    const dry = await render(source, state({ chain: chain([]) }))
    const out = mono(dry)
    const src = mono(source)
    expect(out.length).toBe(src.length)
    expect(meanAbs(out, src)).toBeLessThan(0.002)
    expect(Math.abs(rms(out) - rms(src))).toBeLessThan(0.002)
  })

  it('applies a strong EQ lowpass so the export differs from the source', async () => {
    const source = sine(3500, 0.2, 0.7)
    const processed = mono(await render(source, eqState(220)))
    expect(rms(processed)).toBeLessThan(rms(mono(source)) * 0.08)
    expect(meanAbs(processed, mono(source))).toBeGreaterThan(0.2)
  })

  it('applies the filter module', async () => {
    const source = sine(4000, 0.2, 0.7)
    const processed = mono(
      await render(
        source,
        state({
          chain: chain(['filter']),
          params: { filterCutoff: 280, filterKind: 0, filterMix: 100, filterSlope: 5, filterDrive: 0 },
        }),
      ),
    )
    expect(rms(processed)).toBeGreaterThan(0.0001)
    expect(rms(processed)).toBeLessThan(rms(mono(source)) * 0.12)
  })

  it('applies distortion as energy, not silence', async () => {
    const source = sine(220, 0.2, 0.85)
    const processed = mono(
      await render(
        source,
        state({
          chain: chain(['distortion']),
          distortionType: 'fold',
          params: { saturation: 85, saturationMix: 100 },
        }),
      ),
    )
    expect(rms(processed)).toBeGreaterThan(0.05)
    expect(meanAbs(processed, mono(source))).toBeGreaterThan(0.05)
  })

  it('applies the compressor curve to a hot signal', async () => {
    const source = sine(180, 0.2, 0.9)
    const processed = mono(
      await render(
        source,
        state({
          chain: chain(['compressor']),
          params: {
            compressorThreshold: -24,
            compressorRatio: 20,
            compressorKnee: 0,
            compressorMakeup: 0,
            compressorAutoMakeup: 0,
          },
        }),
      ),
    )
    expect(peak(processed, 200)).toBeLessThan(peak(mono(source)) * 0.7)
    expect(rms(processed)).toBeGreaterThan(0.02)
  })

  it('keeps a delay tail after the source ends', async () => {
    const source = burst(0.18, 0.025)
    const processed = await render(
      source,
      state({
        chain: chain(['delay']),
        params: {
          delayWet: 100,
          delayDry: 40,
          delayTime: 90,
          delayFeedback: 45,
          delayStereo: 0,
        },
      }),
    )
    const out = mono(processed)
    const sourceFrames = mono(source).length
    expect(out.length).toBeGreaterThan(sourceFrames + Math.floor(0.05 * SR))
    expect(out.length).toBeLessThan(sourceFrames + Math.floor(4 * SR))
    expect(rms(out, sourceFrames, sourceFrames + Math.floor(0.2 * SR))).toBeGreaterThan(0.01)
  })

  it('keeps a reverb tail and stops after it decays', async () => {
    const source = burst(0.12, 0.02)
    const processed = await render(
      source,
      state({
        chain: chain(['reverb']),
        reverbType: 'room',
        params: {
          reverbWet: 100,
          reverbDry: 0,
          reverbDecay: 0.35,
          reverbSize: 15,
          reverbPredelay: 0,
          reverbDiffusion: 40,
        },
      }),
    )
    const out = mono(processed)
    const sourceFrames = mono(source).length
    expect(rms(out)).toBeGreaterThan(0.005)
    expect(out.length).toBeGreaterThan(sourceFrames + Math.floor(0.05 * SR))
    expect(out.length).toBeLessThan(sourceFrames + Math.floor(3 * SR))
    const tailEnd = Math.max(0, out.length - Math.floor(0.03 * SR))
    expect(peak(out, tailEnd)).toBeLessThan(0.02)
  })

  it('renders several effects together, including a tail', async () => {
    const source = burst(0.2, 0.08, 0.7, 180)
    const processed = await render(
      source,
      state({
        chain: chain(['distortion', 'eq', 'compressor', 'delay']),
        distortionType: 'clip',
        params: {
          saturation: 60,
          saturationMix: 100,
          eq1Freq: 900,
          compressorThreshold: -18,
          compressorRatio: 8,
          compressorKnee: 0,
          delayWet: 70,
          delayDry: 80,
          delayTime: 70,
          delayFeedback: 30,
          delayStereo: 0,
        },
        eqById: {
          'eq-1': { bands: lowpassBands(900), bandsL: [], bandsR: [], comb: defaultCombFilter() },
        },
      }),
    )
    const out = mono(processed)
    expect(meanAbs(out.subarray(0, mono(source).length), mono(source))).toBeGreaterThan(0.04)
    expect(out.length).toBeGreaterThan(mono(source).length)
    expect(rms(out)).toBeGreaterThan(0.02)
  })

  it('follows Audio Chain order', async () => {
    const source = sine(180, 0.22, 0.8)
    const params = {
      saturation: 90,
      saturationMix: 100,
      filterCutoff: 700,
      filterKind: 0,
      filterMix: 100,
      filterSlope: 5,
      filterDrive: 0,
    }
    const first = mono(
      await render(
        source,
        state({
          chain: ordered(['gain', 'distortion', 'filter', 'output']),
          distortionType: 'fold',
          params,
        }),
      ),
    )
    const second = mono(
      await render(
        source,
        state({
          chain: ordered(['gain', 'filter', 'distortion', 'output']),
          distortionType: 'fold',
          params,
        }),
      ),
    )
    expect(Math.abs(highShare(first) - highShare(second))).toBeGreaterThan(0.02)
  })

  it('renders automation on the sample timeline instead of the initial value', async () => {
    const source = sine(330, 0.4, 0.5)
    const fading = lane('gain', 0, -18, 0, 0.4)
    const moved = lane('gain', 0, -18, 1, 1.4)
    const auto = mono(await render(source, state({ automation: fading })))
    const shifted = mono(await renderProcessedPcm(source, state({ automation: moved }), { factory, timelineStart: 1 }))
    const flat = mono(await render(source, state()))
    const early = Math.floor(0.05 * SR)
    const late = Math.floor(0.32 * SR)
    const span = Math.floor(0.06 * SR)
    expect(rms(auto, early, early + span)).toBeGreaterThan(rms(auto, late, late + span) * 2)
    expect(rms(shifted, early, early + span)).toBeGreaterThan(rms(shifted, late, late + span) * 2)
    expect(Math.abs(rms(flat, early, early + span) - rms(flat, late, late + span))).toBeLessThan(0.02)
  })

  it('renders filter-cutoff modulation and stays deterministic', async () => {
    const n = Math.floor(0.35 * SR)
    const ch = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / SR
      ch[i] =
        0.35 * Math.sin(2 * Math.PI * 420 * t) +
        0.35 * Math.sin(2 * Math.PI * 1400 * t) +
        0.25 * Math.sin(2 * Math.PI * 3600 * t)
    }
    const source: Pcm = { sampleRate: SR, channels: [ch] }
    const lfos: FxLfoMap = defaultFxLfos()
    lfos.filter[0] = { rateHz: 6, shape: 'sine', depth: 100, target: 'filterCutoff' }
    const modulated = mono(
      await render(
        source,
        state({
          chain: chain(['filter']),
          fxLfos: lfos,
          params: { filterCutoff: 900, filterKind: 0, filterMix: 100, filterSlope: 4, filterDrive: 0 },
        }),
      ),
    )
    const again = mono(
      await render(
        source,
        state({
          chain: chain(['filter']),
          fxLfos: lfos,
          params: { filterCutoff: 900, filterKind: 0, filterMix: 100, filterSlope: 4, filterDrive: 0 },
        }),
      ),
    )
    const frozen = mono(
      await render(
        source,
        state({
          chain: chain(['filter']),
          params: { filterCutoff: 900, filterKind: 0, filterMix: 100, filterSlope: 4, filterDrive: 0 },
        }),
      ),
    )
    expect(meanAbs(modulated, frozen)).toBeGreaterThan(0.02)
    expect(meanAbs(modulated, again)).toBeLessThan(1e-4)
    expect(rms(modulated)).toBeGreaterThan(0.02)
  })

  it('ignores a bypassed module', async () => {
    const source = sine(1000, 0.15, 0.6)
    const bypassed = mono(await render(source, state({ chain: chain([]), params: { eq1Freq: 180 } })))
    const removed = mono(await render(source, state()))
    const enabled = mono(await render(source, eqState(180)))
    expect(meanAbs(bypassed, removed)).toBeLessThan(0.002)
    expect(meanAbs(enabled, removed)).toBeGreaterThan(0.15)
  })

  it('applies output gain once and normalizes only when asked', async () => {
    const source = sine(440, 0.2, 0.4)
    const unity = mono(await render(source, state()))
    const quieter = mono(await render(source, state({ params: { outputGain: -6 } })))
    const ratio = rms(quieter) / rms(unity)
    expect(ratio).toBeGreaterThan(0.45)
    expect(ratio).toBeLessThan(0.58)
    const prep = defaultPrep(0.2)
    const plain = mono(await renderExportPcm(source, prep, settings('project', false), state(), { factory }))
    const normalized = mono(await renderExportPcm(source, prep, settings('project', true), state(), { factory }))
    expect(peak(plain)).toBeLessThan(0.55)
    expect(peak(normalized)).toBeGreaterThan(dbToGain(-1) - 0.03)
    expect(peak(normalized)).toBeLessThan(dbToGain(-1) + 0.03)
  })

  it('exports only the selection, processed, with a tail and no audio before it', async () => {
    const seconds = 0.8
    const n = Math.floor(seconds * SR)
    const ch = new Float32Array(n)
    ch[8] = 1
    const sel0 = Math.floor(0.3 * SR)
    const sel1 = Math.floor(0.48 * SR)
    for (let i = sel0; i < sel1; i++) ch[i] = 0.45 * Math.sin((2 * Math.PI * 520 * (i - sel0)) / SR)
    const source: Pcm = { sampleRate: SR, channels: [ch] }
    const prep = {
      ...defaultPrep(seconds),
      selectionStart: 0.3,
      selectionEnd: 0.48,
    }
    const snap = state({
      chain: chain(['delay', 'filter']),
      params: {
        delayWet: 100,
        delayDry: 30,
        delayTime: 60,
        delayFeedback: 40,
        delayStereo: 0,
        filterCutoff: 1200,
        filterMix: 100,
        filterSlope: 3,
      },
    })
    const selected = await renderExportPcm(source, prep, settings('selection'), snap, { factory })
    const project = await renderExportPcm(source, prep, settings('project'), snap, { factory })
    const out = mono(selected)
    const whole = mono(project)
    const selFrames = sel1 - sel0
    let firstLoud = -1
    for (let i = 0; i < out.length; i++) {
      if (Math.abs(out[i] ?? 0) > 0.05) {
        firstLoud = i
        break
      }
    }
    // Wet delay places the selection at the file start. A pre-roll click would
    // not sustain; the region tone does, about one delay time after sample 0.
    expect(firstLoud).toBeGreaterThan(Math.floor(0.04 * SR))
    expect(firstLoud).toBeLessThan(Math.floor(0.09 * SR))
    expect(rms(out, firstLoud, firstLoud + Math.floor(0.05 * SR))).toBeGreaterThan(0.1)
    expect(peak(whole, 0, Math.floor(0.2 * SR))).toBeGreaterThan(0.08)
    expect(whole.length).toBeGreaterThan(out.length + Math.floor(0.2 * SR))
    expect(out.length).toBeGreaterThan(selFrames)
    expect(out.length).toBeLessThan(selFrames + Math.floor(2.5 * SR))
    expect(rms(out, selFrames, Math.min(out.length, selFrames + Math.floor(0.12 * SR)))).toBeGreaterThan(0.008)
    expect(selectionExportAvailable(defaultPrep(seconds))).toBe(false)
  })

  it('writes the highlighted span, not a stale prep selection', async () => {
    const seconds = 1
    const n = Math.floor(seconds * SR)
    const ch = new Float32Array(n)
    const stale0 = Math.floor(0.1 * SR)
    const stale1 = Math.floor(0.25 * SR)
    for (let i = stale0; i < stale1; i++) ch[i] = 0.9
    const keep0 = Math.floor(0.55 * SR)
    const keep1 = Math.floor(0.75 * SR)
    for (let i = keep0; i < keep1; i++) ch[i] = 0.4 * Math.sin((2 * Math.PI * 660 * (i - keep0)) / SR)
    const stale = { ...defaultPrep(seconds), selectionStart: 0.1, selectionEnd: 0.25 }
    const clock = { bufferDuration: seconds, regionStart: 0.55, regionEnd: 0.75 }
    const prep = prepForWorkingExport(stale, 'selection', clock)
    const out = mono(await renderExportPcm({ sampleRate: SR, channels: [ch] }, prep, settings('selection'), state(), { factory }))
    const tone = ch.slice(keep0, keep1)
    expect(out.length).toBe(tone.length)
    expect(meanAbs(out, tone)).toBeLessThan(0.01)
    expect(rms(out)).toBeGreaterThan(0.15)
    expect(rms(out)).toBeLessThan(0.35)
  })

  it('keeps bypassed delay and reverb from extending the file', async () => {
    const source = burst(0.2)
    const bypassed = mono(
      await render(
        source,
        state({
          chain: chain([]),
          params: { delayWet: 100, delayFeedback: 95, delayTime: 500, reverbWet: 90, reverbDecay: 8, reverbSize: 100 },
        }),
      ),
    )
    expect(bypassed.length).toBe(mono(source).length)
  })

  it('stays finite when an LFO moves the reverb impulse', async () => {
    const lfos: FxLfoMap = defaultFxLfos()
    lfos.reverb[0] = { rateHz: 0.4, shape: 'sine', depth: 100, target: 'reverbDecay' }
    lfos.reverb[1] = { rateHz: 0.2, shape: 'sine', depth: 80, target: 'reverbSize' }
    const source = burst(0.35)
    const processed = mono(
      await render(
        source,
        state({
          chain: chain(['reverb']),
          fxLfos: lfos,
          params: { reverbWet: 80, reverbDry: 20, reverbDecay: 1.6, reverbSize: 50 },
        }),
      ),
    )
    const dry = mono(await render(source, state({ chain: chain([]) })))
    expect(processed.length).toBeLessThanOrEqual(mono(source).length + Math.ceil(12 * SR))
    expect(Number.isFinite(processed.length)).toBe(true)
    expect(rms(processed)).toBeGreaterThan(0.002)
    expect(meanAbs(processed.subarray(0, dry.length), dry)).toBeGreaterThan(0.01)
  })

  it('writes a baked later fragment, not the same-length head of the source', async () => {
    const seconds = 2
    const n = Math.floor(seconds * SR)
    const ch = new Float32Array(n)
    ch[8] = 1
    const cut = Math.floor(1.2 * SR)
    const span = Math.floor(0.35 * SR)
    for (let i = 0; i < span; i++) ch[cut + i] = 0.55 * Math.sin((2 * Math.PI * 440 * i) / SR)
    const working: Pcm = { sampleRate: SR, channels: [ch.slice(cut, cut + span)] }
    const stale = { ...defaultPrep(seconds), selectionStart: 1.2, selectionEnd: 1.2 + span / SR }
    const clock = { bufferDuration: span / SR, regionStart: 0, regionEnd: span / SR }
    const prep = prepForWorkingExport(stale, 'project', clock)
    const baked = mono(await renderExportPcm(working, prep, settings(), state(), { factory }))
    const headPrep = { ...defaultPrep(seconds), windowStart: 0, windowEnd: span / SR }
    const head = mono(await renderExportPcm({ sampleRate: SR, channels: [ch] }, headPrep, settings(), state(), { factory }))
    expect(baked.length).toBe(span)
    expect(meanAbs(baked, working.channels[0]!)).toBeLessThan(0.01)
    expect(rms(baked)).toBeGreaterThan(0.2)
    expect(Math.abs(head[8] ?? 0)).toBeGreaterThan(0.5)
    expect(rms(head, 40, Math.min(head.length, 400))).toBeLessThan(0.02)
    expect(meanAbs(baked, head)).toBeGreaterThan(0.2)
  })

  it('ramps gain, pan, filter, EQ, delay, reverb, LFO, and sensory moves without a broadband click', async () => {
    const source = sine(330, 0.7, 0.45)
    const src = mono(source)
    const at = 0.32

    const gainMoved = mono(
      await render(source, state({ automation: lane('gain', 0, -18, at, at + 0.001) })),
    )
    const gainStep = stepped(src, at, dbToGain(0), dbToGain(-18))
    expect(highBandDb(gainMoved, at)).toBeLessThan(highBandDb(gainStep, at) - 10)
    expect(sampleDelta(gainMoved, at)).toBeLessThan(sampleDelta(gainStep, at) * 0.35)

    const panMoved = mono(
      await render(source, state({ automation: lane('pan', 0, 90, at, at + 0.001) })),
    )
    const panStep = stepped(src, at, 1, Math.cos(((0.9 + 1) / 2) * (Math.PI / 2)))
    expect(highBandDb(panMoved, at)).toBeLessThan(highBandDb(panStep, at) - 8)

    const filtered = mono(
      await render(
        source,
        state({
          chain: chain(['filter']),
          params: { filterCutoff: 500, filterKind: 0, filterMix: 100, filterSlope: 2, filterDrive: 0, filterReso: 0.8 },
          automation: lane('filterCutoff', 500, 8000, at, at + 0.001),
        }),
      ),
    )
    expect(filtered.every((sample) => Number.isFinite(sample))).toBe(true)
    expect(sampleDelta(filtered, at)).toBeLessThan(0.25)

    const eq = mono(
      await render(
        source,
        state({
          chain: chain(['eq']),
          params: { eq1Freq: 400, eq1Q: 0.707, eq1Gain: 6 },
          eqById: {
            'eq-1': {
              bands: [
                { ...defaultEqBands()[0]!, type: 'peaking', frequency: 400, gain: 6, q: 0.9, slope: 12, bypassed: false },
              ],
              bandsL: [],
              bandsR: [],
              comb: defaultCombFilter(),
            },
          },
          automation: lane('eq1Freq', 400, 5000, at, at + 0.001),
        }),
      ),
    )
    expect(eq.every((sample) => Number.isFinite(sample))).toBe(true)
    expect(sampleDelta(eq, at)).toBeLessThan(0.25)

    const delayed = mono(
      await render(
        source,
        state({
          chain: chain(['delay']),
          params: { delayWet: 0, delayFeedback: 20, delayTime: 80 },
          automation: lane('delayWet', 0, 45, at, at + 0.001),
        }),
      ),
    )
    expect(delayed.every((sample) => Number.isFinite(sample))).toBe(true)
    expect(sampleDelta(delayed, at)).toBeLessThan(0.2)

    const reverbed = mono(
      await render(
        source,
        state({
          chain: chain(['reverb']),
          params: { reverbWet: 0, reverbDecay: 0.4, reverbSize: 20 },
          automation: lane('reverbWet', 0, 40, at, at + 0.001),
        }),
      ),
    )
    expect(reverbed.every((sample) => Number.isFinite(sample))).toBe(true)
    expect(sampleDelta(reverbed, at)).toBeLessThan(0.35)

    const lfos: FxLfoMap = defaultFxLfos()
    lfos.input[0] = { rateHz: 5, shape: 'square', depth: 100, target: 'gain' }
    const lfo = mono(await render(source, state({ fxLfos: lfos, params: { gain: 0 } })))
    const lfoStep = stepped(src, 0.2, dbToGain(12), dbToGain(-12))
    expect(highBandDb(lfo, 0.2)).toBeLessThan(highBandDb(lfoStep, 0.2) - 8)
    expect(lfo.every((sample) => Number.isFinite(sample))).toBe(true)

    const sensoryBase = snapshotFromEngine({
      params: defaultParamValues(),
      eqBands: defaultEqBands(),
      chain: factoryChain(),
    })
    const rest = mapSensoryToDsp(sensoryBase, defaultSensoryValues())
    const moved = applyColorSound(
      mapSensoryToDsp(sensoryBase, patchSensoryValue(defaultSensoryValues(), 'space', 0.85)),
      { x: 0.2, y: 0.85 },
      patchSensoryValue(defaultSensoryValues(), 'space', 0.85),
    )
    const watched: ParamId[] = ['gain', 'filterCutoff', 'reverbWet', 'reverbDecay', 'delayWet', 'eq1Gain', 'eq1Freq', 'pan']
    let watchedId: ParamId = 'reverbWet'
    let watchedDelta = 0
    for (const id of watched) {
      const delta = Math.abs((moved.params[id] ?? 0) - (rest.params[id] ?? 0))
      if (delta > watchedDelta) {
        watchedDelta = delta
        watchedId = id
      }
    }
    expect(watchedDelta).toBeGreaterThan(0.5)
    const fromValue = rest.params[watchedId] ?? 0
    const toValue = moved.params[watchedId] ?? 0
    const sensory = mono(
      await render(
        source,
        state({
          chain: chain(['reverb', 'filter', 'eq']),
          params: { ...rest.params },
          automation: lane(watchedId, fromValue, toValue, at, at + 0.001),
        }),
      ),
    )
    expect(sensory.every((sample) => Number.isFinite(sample))).toBe(true)
    expect(sampleDelta(sensory, at)).toBeLessThan(0.4)
    if (watchedId === 'gain' && Math.abs(dbToGain(fromValue) - dbToGain(toValue)) > 0.05) {
      const sensoryStep = stepped(src, at, dbToGain(fromValue), dbToGain(toValue))
      expect(highBandDb(sensory, at)).toBeLessThan(highBandDb(sensoryStep, at) - 8)
    }
  })
})
