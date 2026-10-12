import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { defaultAutomation, type AutomationDocument } from '../automation/automation'
import { factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import { defaultFxLfos, type FxLfoMap } from '../fx/lfo'
import { PARAMS, defaultParamValues } from '../parameters/definitions'
import { toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { defaultPrep } from '../samplePrep/state'
import type { ExportSettings, Pcm, SamplePrepState } from '../samplePrep/types'
import { defaultCombFilter } from './comb'
import { defaultEqBands } from './eqBands'
import { AudioEngine } from './AudioEngine'
import {
  planExportPreview,
  previewCoversExport,
  previewWasCancelled,
  renderExportPreviewPcm,
} from './exportPreview'
import type { OfflineContextFactory, ProcessingSnapshot } from './offlineRender'
import { renderExportPcm } from './offlineRender'

const SR = 22050

const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

function sine(freq: number, seconds: number, amp = 0.5): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return { sampleRate: SR, channels: [ch, new Float32Array(ch)] }
}

function chain(enabled: ModuleType[]): ChainModule[] {
  const on = new Set(enabled)
  return factoryChain().map((mod) => ({
    ...mod,
    bypassed: mod.type !== 'gain' && mod.type !== 'output' && !on.has(mod.type),
  }))
}

function state(
  patch: Partial<Omit<ProcessingSnapshot, 'params'>> & { params?: Partial<Record<ParamId, number>> } = {},
): ProcessingSnapshot {
  return {
    chain: patch.chain ?? chain([]),
    params: { ...defaultParamValues(), gain: 0, outputGain: 0, ...patch.params },
    automation: patch.automation ?? defaultAutomation(),
    fxLfos: patch.fxLfos ?? defaultFxLfos(),
    eqById: patch.eqById ?? {},
    eqChannelMode: 'shared',
    primaryEqId: 'eq-1',
    distortionType: 'clip',
    distortionNoiseKind: 'white',
    delayType: 'digital',
    reverbType: 'room',
    voiceGain: 1,
    masterGain: 1,
    noiseMuted: false,
    noiseFadeTau: 0.012,
  }
}

function settings(patch: Partial<ExportSettings> = {}): ExportSettings {
  return {
    name: 'preview',
    sampleRate: 'original',
    bitDepth: 24,
    applyFades: false,
    applyGain: false,
    applyReverse: false,
    applyNormalize: false,
    includeEffectTail: true,
    scope: 'project',
    ...patch,
  }
}

function mono(pcm: Pcm): Float32Array {
  return pcm.channels[0] ?? new Float32Array()
}

function meanAbs(a: Float32Array, b: Float32Array, start = 0, end = Math.min(a.length, b.length)): number {
  const last = Math.min(a.length, b.length, end)
  let sum = 0
  let n = 0
  for (let i = Math.max(0, start); i < last; i++) {
    sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0))
    n++
  }
  return n > 0 ? sum / n : 0
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

describe('export preview window', () => {
  it('starts at the playhead and stays inside the export range', () => {
    const plan = planExportPreview({ exportStart: 1, exportEnd: 9, playhead: 3, durationSec: 8 })
    expect(plan).toMatchObject({ localStartSec: 2, localDurSec: 6, anchor: 'playhead', playheadOutside: false })
  })

  it('does not follow a playhead outside the range', () => {
    const plan = planExportPreview({ exportStart: 2, exportEnd: 5, playhead: 0.2, durationSec: 8 })
    expect(plan?.playheadOutside).toBe(true)
    expect(plan?.localStartSec).toBe(0)
    expect(plan?.anchor).toBe('range-start')
    expect((plan?.localStartSec ?? 0) + (plan?.localDurSec ?? 0)).toBeLessThanOrEqual(3)
  })

  it('keeps a short selection and rejects an empty one', () => {
    const short = planExportPreview({ exportStart: 1, exportEnd: 1.4, playhead: 1.1, durationSec: 8 })
    expect(short?.localDurSec).toBeCloseTo(0.3, 2)
    expect(planExportPreview({ exportStart: 1, exportEnd: 1, playhead: 1, durationSec: 8 })).toBeNull()
    expect(planExportPreview({ exportStart: 2, exportEnd: 1, playhead: 1, durationSec: 8 })).toBeNull()
  })

  it('mirrors the playhead when the export reverses the range', () => {
    const plan = planExportPreview({
      exportStart: 0,
      exportEnd: 4,
      playhead: 1,
      durationSec: 5,
      reversed: true,
    })
    expect(plan?.localStartSec).toBeCloseTo(3, 5)
    expect(plan?.playheadOutside).toBe(false)
  })
})

describe('export preview render', () => {
  it('matches a full export when the window covers that export', async () => {
    const source = sine(440, 0.35)
    const prep = defaultPrep(0.35)
    const snap = state({ params: { outputGain: -6 } })
    const full = await renderExportPcm(source, prep, settings(), snap, { factory })
    const plan = planExportPreview({ exportStart: 0, exportEnd: 0.35, playhead: 0, durationSec: 8 })
    expect(plan && previewCoversExport(plan)).toBe(true)
    const preview = await renderExportPreviewPcm(source, prep, settings(), snap, plan!, { factory })
    expect(preview.channels.length).toBe(full.channels.length)
    expect(meanAbs(mono(preview), mono(full))).toBeLessThan(1e-4)
  })

  it('matches the export prefix for EQ, compression, delay, and reverb', async () => {
    const source = sine(330, 0.5, 0.45)
    const prep = defaultPrep(0.5)
    const cases: ProcessingSnapshot[] = [
      state({
        chain: chain(['eq']),
        params: { eq1Freq: 180, eq1Q: 0.7 },
        eqById: {
          'eq-1': {
            bands: defaultEqBands().map((band, index) =>
              index === 0 ? { ...band, type: 'lowpass', frequency: 180, q: 0.7, slope: 24, bypassed: false } : band,
            ),
            bandsL: [],
            bandsR: [],
            comb: defaultCombFilter(),
          },
        },
      }),
      state({
        chain: chain(['compressor']),
        params: { compressorThreshold: -18, compressorRatio: 4, compressorMakeup: 0 },
      }),
      state({
        chain: chain(['delay']),
        params: { delayWet: 40, delayDry: 80, delayTime: 40, delayFeedback: 20, delayStereo: 0 },
      }),
      state({
        chain: chain(['reverb']),
        params: { reverbWet: 30, reverbDry: 80, reverbDecay: 0.4, reverbSize: 30 },
      }),
    ]
    for (const snap of cases) {
      const full = mono(await renderExportPcm(source, prep, settings({ includeEffectTail: true }), snap, { factory }))
      const plan = planExportPreview({ exportStart: 0, exportEnd: 0.5, playhead: 0, durationSec: 5 })
      const preview = mono(await renderExportPreviewPcm(source, prep, settings(), snap, plan!, { factory }))
      const frames = Math.floor(0.5 * SR)
      expect(meanAbs(preview, full, 0, frames)).toBeLessThan(0.01)
    }
  })

  it('keeps automation and a sine LFO aligned with a later export window', async () => {
    const source = sine(220, 1, 0.4)
    const prep = defaultPrep(1)
    const lfos: FxLfoMap = defaultFxLfos()
    lfos.input[0] = { rateHz: 2, shape: 'sine', depth: 80, target: 'gain' }
    const snap = state({ automation: lane('outputGain', 0, -12, 0, 1), fxLfos: lfos })
    const full = mono(await renderExportPcm(source, prep, settings({ includeEffectTail: false }), snap, { factory }))
    const plan = planExportPreview({ exportStart: 0, exportEnd: 1, playhead: 0.45, durationSec: 5 })
    const preview = mono(
      await renderExportPreviewPcm(source, prep, settings({ includeEffectTail: false }), snap, plan!, { factory }),
    )
    const start = Math.floor(0.45 * SR)
    expect(meanAbs(preview, full.subarray(start), 80, Math.min(preview.length, full.length - start) - 80)).toBeLessThan(0.02)
  })

  it('does not re-normalize a partial window', async () => {
    const source = sine(440, 0.8, 0.2)
    const prep = defaultPrep(0.8)
    const snap = state()
    const normalized = mono(
      await renderExportPcm(source, prep, settings({ applyNormalize: true, includeEffectTail: false }), snap, { factory }),
    )
    const plan = planExportPreview({ exportStart: 0, exportEnd: 0.8, playhead: 0.3, durationSec: 5 })
    const preview = mono(
      await renderExportPreviewPcm(source, prep, settings({ applyNormalize: true, includeEffectTail: false }), snap, plan!, {
        factory,
      }),
    )
    const start = Math.floor(0.3 * SR)
    expect(meanAbs(preview, normalized.subarray(start), 0, Math.min(preview.length, 4000))).toBeGreaterThan(0.02)
  })

  it('leaves the source and the project prep untouched', async () => {
    const source = sine(440, 0.2)
    const before = source.channels[0]![10]
    const prep = defaultPrep(0.2)
    const prepCopy = { ...prep }
    const plan = planExportPreview({ exportStart: 0, exportEnd: 0.2, playhead: 0, durationSec: 5 })!
    await renderExportPreviewPcm(source, prep, settings(), state(), plan, { factory })
    expect(source.channels[0]![10]).toBe(before)
    expect(prep).toEqual(prepCopy)
  })

  it('rejects a cancelled render before playback', async () => {
    const controller = new AbortController()
    controller.abort()
    const plan = planExportPreview({ exportStart: 0, exportEnd: 0.2, playhead: 0, durationSec: 5 })!
    await expect(
      renderExportPreviewPcm(sine(440, 0.2), defaultPrep(0.2), settings(), state(), plan, {
        factory,
        signal: controller.signal,
      }),
    ).rejects.toSatisfy(previewWasCancelled)
  })

  it('exports mono from the channel mode without a second processor', async () => {
    const source = sine(440, 0.2, 0.3)
    const prep: SamplePrepState = { ...defaultPrep(0.2), channelMode: 'mono' }
    const plan = planExportPreview({ exportStart: 0, exportEnd: 0.2, playhead: 0, durationSec: 5 })!
    const preview = await renderExportPreviewPcm(source, prep, settings(), state(), plan, { factory })
    const full = await renderExportPcm(source, prep, settings(), state(), { factory })
    expect(preview.channels.length).toBe(full.channels.length)
    expect(meanAbs(mono(preview), mono(full))).toBeLessThan(1e-3)
  })
})

describe('export preview playback isolation', () => {
  it('does not move transport, replace the context, or record an undo', async () => {
    const engine = new AudioEngine()
    const offline = new OfflineAudioContext(2, SR, SR)
    engine.useOfflineGraph(offline as unknown as AudioContext)
    const ctx = engine.getLiveContext()
    expect(engine.loadPcm([new Float32Array(SR), new Float32Array(SR)], SR)).toBe(true)
    const before = engine.getSnapshot()
    const head = engine.getPlayheadSeconds()
    const played = await engine.playExportPreview({
      sampleRate: SR,
      channels: [new Float32Array(SR / 10).fill(0.1)],
    })
    expect(played).toBe('playing')
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getSnapshot().exportPreviewPlaying).toBe(true)
    expect(engine.getPlayheadSeconds()).toBe(head)
    expect(engine.getLiveContext()).toBe(ctx)
    engine.stopExportPreview()
    const after = engine.getSnapshot()
    expect(after.exportPreviewPlaying).toBe(false)
    expect(after.playing).toBe(false)
    expect(after.canUndoPrep).toBe(before.canUndoPrep)
    expect(after.params).toEqual(before.params)
    expect(after.prep).toEqual(before.prep)
    expect(engine.getPlayheadSeconds()).toBe(head)
  })

  it('renders a preview without changing the project or the context', async () => {
    const host = globalThis as { OfflineAudioContext?: typeof OfflineAudioContext }
    const previous = host.OfflineAudioContext
    host.OfflineAudioContext = OfflineAudioContext
    const engine = new AudioEngine()
    const offline = new OfflineAudioContext(2, SR, SR)
    engine.useOfflineGraph(offline as unknown as AudioContext)
    const ctx = engine.getLiveContext()
    expect(engine.loadPcm([new Float32Array(SR).map((_, i) => Math.sin(i / 20) * 0.2)], SR)).toBe(true)
    const before = engine.getSnapshot()
    const plan = planExportPreview({
      exportStart: 0,
      exportEnd: before.duration,
      playhead: 0,
      durationSec: 5,
    })
    const pcm = await engine.renderExportPreview(
      {
        name: 'preview',
        sampleRate: 'original',
        bitDepth: 24,
        applyFades: false,
        applyGain: false,
        applyReverse: false,
        applyNormalize: false,
        includeEffectTail: false,
        scope: 'project',
      },
      plan!,
    )
    const after = engine.getSnapshot()
    expect(pcm && (pcm.channels[0]?.length ?? 0)).toBeGreaterThan(10)
    expect(after.playing).toBe(false)
    expect(after.canUndoPrep).toBe(before.canUndoPrep)
    expect(after.params).toEqual(before.params)
    expect(after.prep).toEqual(before.prep)
    expect(after.chain).toEqual(before.chain)
    expect(engine.getPlayheadSeconds()).toBe(0)
    expect(engine.getLiveContext()).toBe(ctx)
    if (previous) host.OfflineAudioContext = previous
    else delete host.OfflineAudioContext
  })

  it('refuses a second audible stream while transport is running', async () => {
    const previous = (globalThis as { window?: unknown }).window
    ;(globalThis as {
      window: {
        setInterval: typeof setInterval
        clearInterval: typeof clearInterval
        setTimeout: typeof setTimeout
        clearTimeout: typeof clearTimeout
      }
    }).window = {
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
    }
    const engine = new AudioEngine()
    engine.useOfflineGraph(new OfflineAudioContext(2, SR, SR) as unknown as AudioContext)
    expect(engine.loadPcm([new Float32Array(SR)], SR)).toBe(true)
    try {
    await engine.play()
    expect(engine.getSnapshot().playing).toBe(true)
    const head = engine.getPlayheadSeconds()
    const blocked = await engine.playExportPreview({
      sampleRate: SR,
      channels: [new Float32Array(200).fill(0.2)],
    })
    expect(blocked).toBe('main-playback')
    expect(engine.getSnapshot().playing).toBe(true)
    expect(engine.getSnapshot().exportPreviewPlaying).toBe(false)
    expect(engine.getPlayheadSeconds()).toBe(head)
    engine.pause()
    expect(engine.getSnapshot().playing).toBe(false)
    expect(engine.getPlayheadSeconds()).toBe(head)
    } finally {
      engine.stop()
      if (previous === undefined) delete (globalThis as { window?: unknown }).window
      else (globalThis as { window?: unknown }).window = previous
    }
  })
})
