import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { defaultAutomation, type AutomationDocument } from '../automation/automation'
import { factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import { defaultFxLfos, type FxLfoMap } from './lfo'
import { PARAMS, defaultParamValues } from '../parameters/definitions'
import { toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import type { Pcm } from '../samplePrep/types'
import type { OfflineContextFactory, ProcessingSnapshot } from '../engine/offlineRender'
import { renderProcessedPcm } from '../engine/offlineRender'

const SR = 22050
const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

const report: Record<string, number> = {}

function sine(freq: number, seconds: number, amp = 0.9): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return { sampleRate: SR, channels: [ch] }
}

function noise(seconds: number, amp = 0.4): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  let s = 1
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647
    ch[i] = ((s / 2147483647) * 2 - 1) * amp
  }
  return { sampleRate: SR, channels: [ch] }
}

function impulse(seconds = 0.35): Pcm {
  const n = Math.max(1, Math.floor(seconds * SR))
  const ch = new Float32Array(n)
  ch[0] = 1
  return { sampleRate: SR, channels: [ch] }
}

function bursts(): Pcm {
  const n = Math.floor(0.28 * SR)
  const ch = new Float32Array(n)
  const write = (at: number, len: number) => {
    const a = Math.floor(at * SR)
    const b = Math.min(n, a + Math.floor(len * SR))
    for (let i = a; i < b; i++) ch[i] = 0.95 * Math.sin((2 * Math.PI * 220 * (i - a)) / SR)
  }
  write(0, 0.02)
  write(0.12, 0.02)
  return { sampleRate: SR, channels: [ch] }
}

function toneBurst(): Pcm {
  const n = Math.floor(0.12 * SR)
  const ch = new Float32Array(n)
  const m = Math.floor(0.04 * SR)
  for (let i = 0; i < m; i++) ch[i] = 0.95 * Math.sin((2 * Math.PI * 180 * i) / SR)
  return { sampleRate: SR, channels: [ch] }
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
  const params = { ...defaultParamValues(), gain: 0, outputGain: 0, ...patch.params }
  return {
    chain: patch.chain ?? defaultChainSafe(),
    params,
    automation: patch.automation ?? defaultAutomation(),
    fxLfos: patch.fxLfos ?? defaultFxLfos(),
    eqById: patch.eqById ?? {},
    eqChannelMode: 'shared',
    primaryEqId: 'eq-1',
    distortionType: 'clip',
    distortionNoiseKind: 'white',
    delayType: 'digital',
    reverbType: patch.reverbType ?? 'room',
    voiceGain: 1,
    masterGain: 1,
    noiseMuted: true,
    noiseFadeTau: 0.012,
    effectById: patch.effectById,
    randomOffsets: patch.randomOffsets,
  }
}

function defaultChainSafe(): ChainModule[] {
  return chain([])
}

async function render(source: Pcm, snap: ProcessingSnapshot): Promise<Float32Array> {
  const pcm = await renderProcessedPcm(source, snap, { factory })
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

function peak(ch: Float32Array, start = 0, end = ch.length): number {
  let m = 0
  for (let i = Math.max(0, start); i < Math.min(ch.length, end); i++) m = Math.max(m, Math.abs(ch[i] ?? 0))
  return m
}

const compBase = {
  compressorKnee: 0,
  compressorAttack: 5,
  compressorRelease: 150,
  compressorMakeup: 0,
  compressorAutoMakeup: 0,
  compressorInput: 0,
}

function compState(params: Partial<Record<ParamId, number>>, bypassed = false): ProcessingSnapshot {
  const modules: ChainModule[] = [
    { instanceId: 'gain-1', type: 'gain', bypassed: false },
    { instanceId: 'compressor-1', type: 'compressor', bypassed },
    { instanceId: 'output-1', type: 'output', bypassed: false },
  ]
  if (bypassed) {
    const slot = modules.find((mod) => mod.type === 'compressor')
    if (slot) slot.bypassed = true
  }
  return state({ chain: modules, params: { ...compBase, compressorThreshold: -24, compressorRatio: 10, ...params } })
}

const reverbBase = {
  reverbCorrelate: 1,
  reverbDecay: 0.3,
  reverbSize: 8,
  reverbPredelay: 0,
  reverbDiffusion: 30,
  reverbOutput: 100,
}

function reverbState(wet: number, extra: Partial<Record<ParamId, number>> = {}): ProcessingSnapshot {
  const linked = (extra.reverbCorrelate ?? 1) > 0.5
  return state({
    chain: chain(['reverb']),
    reverbType: 'room',
    params: {
      ...reverbBase,
      reverbWet: wet,
      reverbDry: linked ? 100 - wet : (extra.reverbDry ?? 100),
      ...extra,
    },
  })
}

describe('reverb mix law', () => {
  it('keeps an impulse dry at 0% wet and reverberant at 100%', async () => {
    const src = impulse()
    const dry = await render(src, reverbState(0))
    const wet = await render(src, reverbState(100))
    const mid = await render(src, reverbState(50))
    const tail = (ch: Float32Array) => rms(ch, Math.floor(0.03 * SR), Math.floor(0.22 * SR))
    report.reverbImpulseDryTail = tail(dry)
    report.reverbImpulseWetTail = tail(wet)
    report.reverbImpulseMidTail = tail(mid)
    report.reverbImpulseDryPeak = peak(dry, 0, Math.floor(0.008 * SR))
    report.reverbImpulseWetPeak = peak(wet, 0, Math.floor(0.008 * SR))
    report.reverbImpulseMidPeak = peak(mid, 0, Math.floor(0.008 * SR))
    expect(tail(dry)).toBeLessThan(0.01)
    expect(peak(dry, 0, 8)).toBeGreaterThan(0.4)
    expect(tail(wet)).toBeGreaterThan(tail(dry) * 4)
    expect(tail(mid)).toBeGreaterThan(tail(dry) * 2)
    expect(peak(mid, 0, 8)).toBeGreaterThan(0.2)
  }, 30000)

  it('does not collapse level at the linked midpoint', async () => {
    const src = noise(0.28, 0.45)
    const levels: number[] = []
    for (const wet of [0, 25, 50, 75, 100]) {
      const ch = await render(src, reverbState(wet))
      const level = rms(ch, Math.floor(0.04 * SR))
      levels.push(level)
      report[`reverbRms${wet}`] = level
      report[`reverbPeak${wet}`] = peak(ch, Math.floor(0.04 * SR))
    }
    const dry = levels[0] ?? 0
    const mid = levels[2] ?? 0
    expect(dry).toBeGreaterThan(0.05)
    expect(mid).toBeGreaterThan(dry * 0.55)
    expect(levels[1] ?? 0).toBeGreaterThan(dry * 0.6)
    expect(levels[3] ?? 0).toBeGreaterThan((levels[4] ?? 0) * 0.45)
  }, 40000)

  it('lets unlinked dry and wet move independently', async () => {
    const src = impulse(0.3)
    const dryOnly = await render(src, reverbState(0, { reverbCorrelate: 0, reverbDry: 100, reverbWet: 0 }))
    const wetOnly = await render(src, reverbState(80, { reverbCorrelate: 0, reverbDry: 0, reverbWet: 80 }))
    const tail = (ch: Float32Array) => rms(ch, Math.floor(0.03 * SR), Math.floor(0.2 * SR))
    report.reverbUnlinkedDryTail = tail(dryOnly)
    report.reverbUnlinkedWetTail = tail(wetOnly)
    expect(peak(dryOnly, 0, 8)).toBeGreaterThan(peak(wetOnly, 0, 8))
    expect(tail(wetOnly)).toBeGreaterThan(tail(dryOnly) * 3)
  }, 30000)
})

describe('compressor dynamics', () => {
  it('reduces a hot tone and reduces more at a lower threshold', async () => {
    const src = sine(180, 0.22, 0.9)
    const dry = await render(src, compState({}, true))
    const mild = await render(src, compState({ compressorThreshold: -6, compressorRatio: 10 }))
    const deep = await render(src, compState({ compressorThreshold: -30, compressorRatio: 10 }))
    const from = Math.floor(0.05 * SR)
    report.compDryRms = rms(dry, from)
    report.compThreshold6 = rms(mild, from)
    report.compThreshold30 = rms(deep, from)
    expect(rms(deep, from)).toBeLessThan(rms(mild, from) * 0.75)
    expect(rms(mild, from)).toBeLessThan(rms(dry, from))
    expect(rms(deep, from)).toBeGreaterThan(0.005)
  }, 30000)

  it('increases reduction as ratio rises and leaves 1:1 near the source', async () => {
    const src = sine(180, 0.22, 0.85)
    const from = Math.floor(0.05 * SR)
    const unity = await render(src, compState({ compressorThreshold: -20, compressorRatio: 1 }))
    const four = await render(src, compState({ compressorThreshold: -20, compressorRatio: 4 }))
    const twenty = await render(src, compState({ compressorThreshold: -20, compressorRatio: 20 }))
    const dry = await render(src, compState({ compressorThreshold: -20, compressorRatio: 1 }, true))
    report.compRatio1 = rms(unity, from)
    report.compRatio4 = rms(four, from)
    report.compRatio20 = rms(twenty, from)
    report.compRatioDry = rms(dry, from)
    expect(Math.abs(rms(unity, from) - rms(dry, from)) / rms(dry, from)).toBeLessThan(0.12)
    expect(rms(twenty, from)).toBeLessThan(rms(four, from))
    expect(rms(four, from)).toBeLessThan(rms(unity, from) * 0.92)
  }, 30000)

  it('lets a slow attack pass more of the transient', async () => {
    const src = toneBurst()
    const fast = await render(src, compState({ compressorThreshold: -24, compressorRatio: 12, compressorAttack: 0.5 }))
    const slow = await render(src, compState({ compressorThreshold: -24, compressorRatio: 12, compressorAttack: 200 }))
    const window = Math.floor(0.012 * SR)
    report.compAttackFast = peak(fast, 0, window)
    report.compAttackSlow = peak(slow, 0, window)
    expect(peak(slow, 0, window)).toBeGreaterThan(peak(fast, 0, window) * 1.08)
  }, 20000)

  it('recovers faster with a short release', async () => {
    const src = bursts()
    const short = await render(src, compState({ compressorThreshold: -24, compressorRatio: 12, compressorAttack: 1, compressorRelease: 20 }))
    const long = await render(src, compState({ compressorThreshold: -24, compressorRatio: 12, compressorAttack: 1, compressorRelease: 800 }))
    const a = Math.floor(0.12 * SR)
    const b = Math.floor(0.16 * SR)
    report.compReleaseShort = peak(short, a, b)
    report.compReleaseLong = peak(long, a, b)
    expect(peak(short, a, b)).toBeGreaterThan(peak(long, a, b) * 1.05)
  }, 20000)

  it('changes the transfer around the knee', async () => {
    const src = sine(220, 0.2, 0.7)
    const from = Math.floor(0.05 * SR)
    const hard = await render(src, compState({ compressorThreshold: -12, compressorRatio: 8, compressorKnee: 0 }))
    const soft = await render(src, compState({ compressorThreshold: -12, compressorRatio: 8, compressorKnee: 40 }))
    report.compKnee0 = rms(hard, from)
    report.compKnee40 = rms(soft, from)
    expect(Math.abs(rms(hard, from) - rms(soft, from)) / Math.max(rms(hard, from), 1e-6)).toBeGreaterThan(0.03)
  }, 20000)

  it('raises output with makeup and still compresses before it', async () => {
    const src = sine(180, 0.22, 0.9)
    const from = Math.floor(0.05 * SR)
    const plain = await render(src, compState({ compressorThreshold: -24, compressorRatio: 8, compressorMakeup: 0 }))
    const lifted = await render(src, compState({ compressorThreshold: -24, compressorRatio: 8, compressorMakeup: 12 }))
    const dry = await render(src, compState({ compressorThreshold: -24, compressorRatio: 8 }, true))
    report.compMakeup0 = rms(plain, from)
    report.compMakeup12 = rms(lifted, from)
    expect(rms(plain, from)).toBeLessThan(rms(dry, from) * 0.75)
    expect(rms(lifted, from)).toBeGreaterThan(rms(plain, from) * 2.5)
  }, 20000)

  it('bypasses back to the dry path', async () => {
    const src = sine(180, 0.18, 0.9)
    const from = Math.floor(0.04 * SR)
    const active = await render(src, compState({ compressorThreshold: -30, compressorRatio: 20, compressorKnee: 6 }))
    const bypassed = await render(src, compState({ compressorThreshold: -30, compressorRatio: 20, compressorKnee: 6 }, true))
    report.compActive = rms(active, from)
    report.compBypass = rms(bypassed, from)
    expect(rms(active, from)).toBeLessThan(rms(bypassed, from) * 0.55)
  }, 20000)

  it('keeps a second compressor on its own parameters', async () => {
    const src = sine(160, 0.2, 0.85)
    const from = Math.floor(0.05 * SR)
    const modules: ChainModule[] = [
      { instanceId: 'gain-1', type: 'gain', bypassed: false },
      { instanceId: 'compressor-a', type: 'compressor', bypassed: true },
      { instanceId: 'compressor-b', type: 'compressor', bypassed: false },
      { instanceId: 'output-1', type: 'output', bypassed: false },
    ]
    const heavy = {
      compressorThreshold: -36,
      compressorRatio: 20,
      compressorKnee: 0,
      compressorAttack: 3,
      compressorRelease: 120,
      compressorMakeup: 0,
      compressorAutoMakeup: 0,
      compressorInput: 0,
    }
    const gentle = { ...heavy, compressorThreshold: -6, compressorRatio: 1 }
    const crushed = await render(
      src,
      state({
        chain: modules,
        params: gentle,
        effectById: {
          'compressor-b': {
            owner: false,
            params: heavy,
            reverbType: 'room',
            delayType: 'digital',
            distortionType: 'clip',
            distortionNoiseKind: 'white',
          },
        },
      }),
    )
    const open = await render(src, state({ chain: modules, params: gentle }))
    report.compInstanceB = rms(crushed, from)
    report.compInstanceLive = rms(open, from)
    expect(rms(crushed, from)).toBeLessThan(rms(open, from) * 0.6)
  }, 20000)

  it('follows automation, LFO, and random into the compressor', async () => {
    const src = sine(180, 0.36, 0.8)
    const from = Math.floor(0.05 * SR)
    const early = Math.floor(0.04 * SR)
    const late = Math.floor(0.26 * SR)
    const span = Math.floor(0.06 * SR)
    const def = PARAMS.compressorThreshold
    const automation: AutomationDocument = {
      selectedParamId: 'compressorThreshold',
      lanes: [
        {
          paramId: 'compressorThreshold',
          nodes: [
            { id: 'a', time: 0, value: toNormalized(-8, def) },
            { id: 'b', time: 0.36, value: toNormalized(-40, def) },
          ],
        },
      ],
    }
    const steady = compState({ compressorThreshold: -8, compressorRatio: 8, compressorAttack: 2, compressorRelease: 40 })
    const auto = await render(src, steady)
    const moved = await render(src, { ...steady, automation })
    const lfos: FxLfoMap = defaultFxLfos()
    lfos.compressor[0] = {
      rateHz: 8,
      shape: 'square',
      depth: 100,
      target: 'compressorThreshold',
      enabled: true,
      instanceId: 'compressor-1',
    }
    const held = compState({ compressorThreshold: -18, compressorRatio: 6, compressorAttack: 2, compressorRelease: 40 })
    const modulated = await render(src, { ...held, fxLfos: lfos })
    const frozen = await render(src, held)
    const flat: AutomationDocument = {
      selectedParamId: 'compressorThreshold',
      lanes: [
        {
          paramId: 'compressorThreshold',
          nodes: [
            { id: 'a', time: 0, value: toNormalized(-10, def) },
            { id: 'b', time: 0.36, value: toNormalized(-10, def) },
          ],
        },
      ],
    }
    const center = compState({ compressorThreshold: -10, compressorRatio: 8, compressorAttack: 2, compressorRelease: 40 })
    const random = await render(src, { ...center, automation: flat, randomOffsets: { compressorThreshold: -0.45 } })
    const centered = await render(src, { ...center, automation: flat })
    report.compAutoEarly = rms(moved, early, early + span)
    report.compAutoLate = rms(moved, late, late + span)
    report.compLfoDelta = Math.abs(rms(modulated, from) - rms(frozen, from))
    report.compRandom = rms(random, from)
    report.compRandomCenter = rms(centered, from)
    expect(rms(moved, late, late + span)).toBeLessThan(rms(moved, early, early + span) * 0.85)
    expect(rms(auto, early, early + span)).toBeGreaterThan(0)
    let diff = 0
    const n = Math.min(modulated.length, frozen.length)
    for (let i = from; i < n; i++) diff += Math.abs((modulated[i] ?? 0) - (frozen[i] ?? 0))
    expect(diff / Math.max(1, n - from)).toBeGreaterThan(0.01)
    expect(rms(random, from)).toBeLessThan(rms(centered, from) * 0.92)
    expect(report.compLfoDelta).toBeGreaterThan(0.01)
  }, 40000)
})
