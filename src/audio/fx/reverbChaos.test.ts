import 'node-web-audio-api/polyfill.js'
import { OfflineAudioContext } from 'node-web-audio-api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAutomation, ensureAutomationLane, resolvePerformanceParams } from '../automation/automation'
import { factoryChain, type ChainModule, type ModuleType } from '../chain/chain'
import { AudioEngine } from '../engine/AudioEngine'
import { renderDemoSample } from '../engine/demoSample'
import { setConvolverPairBuffer } from '../engine/convolverCrossfade'
import type { OfflineContextFactory, ProcessingSnapshot } from '../engine/offlineRender'
import { renderProcessedPcm } from '../engine/offlineRender'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { catalogFor } from '../random/catalog'
import { isRandomizable, randomParamValue, randomWindow } from '../random/distributions'
import { planReverbRandom, reverbRandomSetupLabel } from '../random/reverbRandom'
import { mulberry32 } from '../random/rng'
import type { Pcm } from '../samplePrep/types'
import { equalPowerDryWet, reverbSendLevels } from './dryWet'
import { fillReverbImpulse, impulseLengthSec, IR_EARLY_SEC, scaleReverbImpulse, type ImpulseSpec } from './impulse'
import { createReverbGraph, applyReverbGraph, buildReverbBuffer, wetDryFor } from './graphs'
import { defaultFxLfos, defaultLfoHold } from './lfo'
import { reverbWetOutputGain } from './reverbLevel'
import { REVERB_TYPES, type ReverbType } from './types'

const SR = 22050
const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  })
})

function chain(enabled: ModuleType[]): ChainModule[] {
  const on = new Set(enabled)
  return factoryChain().map((mod) => ({
    ...mod,
    bypassed: mod.type !== 'gain' && mod.type !== 'output' && !on.has(mod.type),
  }))
}

function baseParams(patch: Partial<Record<ParamId, number>> = {}): Record<ParamId, number> {
  return {
    ...defaultParamValues(),
    gain: 0,
    outputGain: 0,
    reverbCorrelate: 1,
    reverbWet: 35,
    reverbDry: 65,
    reverbOutput: 100,
    reverbDecay: 1.6,
    reverbSize: 48,
    reverbPredelay: 12,
    reverbDamping: 7000,
    reverbDuck: 0,
    reverbGate: 0,
    reverbFreeze: 0,
    ...patch,
  }
}

function refs(): string[] {
  return catalogFor('reverb').map((entry) => entry.ref)
}

function planOnce(
  rand: () => number,
  chaos: boolean,
  params = baseParams(),
  type: ReverbType = 'hall',
): { params: Record<ParamId, number>; type: ReverbType } {
  const next = planReverbRandom({
    params,
    type,
    chaos,
    participating: refs(),
    intensity: () => (chaos ? 0.85 : 0.7),
    rand,
    bpm: 120,
  })
  return { params: { ...params, ...next.patch }, type: next.type }
}

function rms(ch: Float32Array, start: number, end: number): number {
  let sum = 0
  let n = 0
  for (let i = start; i < end; i++) {
    const x = ch[i] ?? 0
    sum += x * x
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

function db(value: number): number {
  return 20 * Math.log10(Math.max(value, 1e-8))
}

function snap(params: Record<ParamId, number>, reverbType: ReverbType): ProcessingSnapshot {
  return {
    chain: chain(['reverb']),
    params,
    automation: defaultAutomation(),
    fxLfos: defaultFxLfos(),
    eqById: {},
    eqChannelMode: 'shared',
    primaryEqId: 'eq-1',
    distortionType: 'clip',
    distortionNoiseKind: 'white',
    delayType: 'digital',
    reverbType,
    voiceGain: 1,
    masterGain: 1,
    noiseMuted: true,
    noiseFadeTau: 0.012,
  }
}

function noise(seconds: number, amp = 0.5): Pcm {
  const n = Math.floor(seconds * SR)
  const ch = new Float32Array(n)
  let s = 1
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647
    ch[i] = ((s / 2147483647) * 2 - 1) * amp
  }
  return { sampleRate: SR, channels: [ch, ch.slice()] }
}

function sine(freq: number, seconds: number, amp = 0.6): Pcm {
  const n = Math.floor(seconds * SR)
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR)
  return { sampleRate: SR, channels: [ch, ch.slice()] }
}

function impulse(): Pcm {
  const n = Math.floor(0.45 * SR)
  const ch = new Float32Array(n)
  ch[0] = 1
  return { sampleRate: SR, channels: [ch, ch.slice()] }
}

function bursts(): Pcm {
  const n = Math.floor(0.45 * SR)
  const ch = new Float32Array(n)
  for (const at of [0.02, 0.16, 0.3]) {
    const a = Math.floor(at * SR)
    for (let i = 0; i < Math.floor(0.03 * SR); i++) {
      const env = Math.exp(-i / (0.008 * SR))
      ch[a + i] = 0.9 * env * Math.sin((2 * Math.PI * 140 * i) / SR)
    }
  }
  return { sampleRate: SR, channels: [ch, ch.slice()] }
}

function voice(): Pcm {
  const n = Math.floor(0.45 * SR)
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const env = 0.5 * (1 - Math.cos((2 * Math.PI * t) / 0.45))
    ch[i] =
      env *
      (0.45 * Math.sin(2 * Math.PI * 196 * t) +
        0.28 * Math.sin(2 * Math.PI * 392 * t) +
        0.12 * Math.sin(2 * Math.PI * 784 * t))
  }
  return { sampleRate: SR, channels: [ch, ch.slice()] }
}

async function render(source: Pcm, params: Record<ParamId, number>, type: ReverbType): Promise<Float32Array> {
  const pcm = await renderProcessedPcm(source, snap(params, type), { factory })
  return pcm.channels[0] ?? new Float32Array()
}

function staging(params: Record<ParamId, number>): number {
  const send = reverbSendLevels(params)
  const wetReturn = reverbWetOutputGain(params.reverbOutput, params.reverbDecay)
  return Math.hypot(send.dry, send.wet * wetReturn)
}

describe('reverb random ownership', () => {
  it('draws one linked Mix and leaves internal gains alone', () => {
    const rand = mulberry32(11)
    const quiet: string[] = []
    for (let i = 0; i < 100; i++) {
      const row = planOnce(rand, false)
      expect(row.params.reverbOutput).toBe(100)
      expect(row.params.reverbLimit).toBe(defaultParamValues().reverbLimit)
      expect(row.params.reverbCorrelate).toBe(1)
      expect(row.params.reverbFreeze).toBe(0)
      expect(row.params.reverbDry + row.params.reverbWet).toBeCloseTo(100, 5)
      expect(row.params.reverbWet).toBeGreaterThanOrEqual(10)
      expect(row.params.reverbWet).toBeLessThanOrEqual(65)
      const send = reverbSendLevels(row.params)
      const law = equalPowerDryWet(row.params.reverbWet / 100)
      expect(send.dry).toBeCloseTo(law.dry, 5)
      expect(send.wet).toBeCloseTo(law.wet, 5)
      expect(Number.isFinite(send.dry) && Number.isFinite(send.wet)).toBe(true)
      if (staging(row.params) < 0.45) {
        quiet.push(`${i} mix=${row.params.reverbWet} decay=${row.params.reverbDecay} out=${row.params.reverbOutput}`)
      }
    }
    expect(quiet).toEqual([])
  })

  it('keeps a valid path across 100 chaos draws, including 0% and 100% wet', () => {
    const rand = mulberry32(19)
    let sawDry = false
    let sawWet = false
    const quiet: string[] = []
    for (let i = 0; i < 100; i++) {
      const row = planOnce(rand, true)
      if (row.params.reverbWet <= 0.001) sawDry = true
      if (row.params.reverbWet >= 99.999) sawWet = true
      expect(row.params.reverbOutput).toBe(100)
      expect(row.params.reverbDry + row.params.reverbWet).toBeCloseTo(100, 5)
      expect(row.params.reverbLowCut + 400).toBeLessThan(row.params.reverbHighCut)
      for (const id of ['reverbWet', 'reverbDry', 'reverbDecay', 'reverbSize', 'reverbPredelay', 'reverbDamping', 'reverbWidth'] as const) {
        expect(Number.isFinite(row.params[id])).toBe(true)
      }
      const send = reverbSendLevels(row.params)
      const again = equalPowerDryWet(row.params.reverbWet / 100)
      expect(send.dry).toBeCloseTo(again.dry, 5)
      expect(send.wet).toBeCloseTo(again.wet, 5)
      if (staging(row.params) < 0.4) {
        quiet.push(
          `${i} type=${row.type} mix=${row.params.reverbWet.toFixed(1)} decay=${row.params.reverbDecay.toFixed(2)} out=${row.params.reverbOutput}`,
        )
      }
    }
    expect(sawDry).toBe(true)
    expect(sawWet).toBe(true)
    expect(quiet).toEqual([])
    expect(randomWindow('reverbWet', false)).toEqual({ min: 10, max: 65 })
    expect(randomWindow('reverbWet', true)).toEqual({ min: 0, max: 100 })
  })

  it('does not apply the equal-power law twice', () => {
    const mix = randomParamValue({ id: 'reverbWet', current: 40, intensity: 1, chaos: false, rand: () => 0.5 })
    expect(mix).toBeGreaterThan(10)
    expect(mix).toBeLessThan(65)
    const once = equalPowerDryWet(50 / 100)
    const twice = equalPowerDryWet(once.wet)
    expect(once.dry).toBeCloseTo(Math.SQRT1_2, 3)
    expect(once.wet).toBeCloseTo(Math.SQRT1_2, 3)
    expect(Math.abs(twice.wet - once.wet)).toBeGreaterThan(0.05)
    expect(randomParamValue({ id: 'reverbWet', current: 30, intensity: 1, chaos: true, rand: () => 0.1 })).toBe(100)
    expect(randomParamValue({ id: 'reverbWet', current: 30, intensity: 1, chaos: true, rand: () => 0.02 })).toBe(0)
    expect(isRandomizable('reverbOutput')).toBe(false)
    expect(isRandomizable('reverbLimit')).toBe(false)
    expect(isRandomizable('reverbDry')).toBe(false)
    expect(reverbRandomSetupLabel('reverbWet')).toBe('Mix')
    expect(catalogFor('reverb').some((entry) => entry.paramId === 'reverbDry')).toBe(false)
    expect(catalogFor('reverb').some((entry) => entry.paramId === 'reverbOutput')).toBe(false)
  })

  it('randomizes unlinked dry and wet as levels without silencing both', () => {
    const rand = mulberry32(4)
    const params = baseParams({ reverbCorrelate: 0, reverbDry: 70, reverbWet: 40 })
    let independent = 0
    for (let i = 0; i < 40; i++) {
      const row = planOnce(rand, true, params, 'room')
      expect(row.params.reverbDry).toBeGreaterThanOrEqual(18)
      expect(row.params.reverbWet).toBeGreaterThanOrEqual(18)
      if (Math.abs(row.params.reverbDry + row.params.reverbWet - 100) > 1) independent += 1
      const send = reverbSendLevels(row.params)
      expect(send.dry).toBeCloseTo(row.params.reverbDry / 100, 5)
      expect(send.wet).toBeCloseTo(row.params.reverbWet / 100, 5)
    }
    expect(independent).toBeGreaterThan(20)
  })

  it('keeps generated impulses above an energy floor for every chaos type', () => {
    const rand = mulberry32(8)
    for (const item of REVERB_TYPES) {
      if (item.value === 'custom') continue
      const row = planOnce(rand, true, baseParams(), item.value)
      const spec: ImpulseSpec = {
        type: item.value,
        sampleRate: 8000,
        decaySec: row.params.reverbDecay,
        size: row.params.reverbSize / 100,
        diffusion: row.params.reverbDiffusion / 100,
        density: row.params.reverbDensity / 100,
        early: row.params.reverbEarly / 100,
        damping: 1 - Math.min(1, row.params.reverbDamping / 18000),
        reverse: row.params.reverbReverse / 100,
        shimmer: row.params.reverbShimmer / 100,
        shimmerPitch: row.params.reverbShimmerPitch,
        color: row.params.reverbColor / 100,
        freeze: false,
      }
      const seconds = impulseLengthSec(spec)
      const n = Math.max(64, Math.floor(8000 * seconds))
      const left = new Float32Array(n)
      const right = new Float32Array(n)
      fillReverbImpulse(left, right, spec)
      scaleReverbImpulse(left, right, 8000)
      const earlyN = Math.min(n, Math.max(1, Math.floor(8000 * IR_EARLY_SEC)))
      let energy = 0
      let pk = 0
      for (let i = 0; i < earlyN; i++) {
        energy += (left[i] ?? 0) ** 2 + (right[i] ?? 0) ** 2
        pk = Math.max(pk, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0))
      }
      const level = Math.sqrt(energy / (2 * earlyN))
      expect(level, item.value).toBeGreaterThan(0.01)
      expect(pk, item.value).toBeGreaterThan(0.04)
      expect(pk, item.value).toBeLessThanOrEqual(0.381)
    }
  })
})

describe('reverb mix renders', () => {
  const src = noise(0.5, 0.5)
  const from = Math.floor(0.06 * SR)
  const to = Math.floor(0.42 * SR)

  it('matches dry at 0%, equal power at 50%, and an audible tail at 100%', async () => {
    const dry = await render(src, baseParams({ reverbWet: 0, reverbDry: 100 }), 'hall')
    const mid = await render(src, baseParams({ reverbWet: 50, reverbDry: 50 }), 'hall')
    const wet = await render(src, baseParams({ reverbWet: 100, reverbDry: 0 }), 'hall')
    const dryLevel = rms(dry, from, to)
    const midLevel = rms(mid, from, to)
    const wetLevel = rms(wet, from, to)
    const drySend = reverbSendLevels(baseParams({ reverbWet: 0, reverbDry: 100 }))
    const midSend = reverbSendLevels(baseParams({ reverbWet: 50, reverbDry: 50 }))
    const wetSend = wetDryFor('reverb', baseParams({ reverbWet: 100, reverbDry: 0 }))
    expect(drySend).toEqual({ dry: 1, wet: 0, out: 1 })
    expect(midSend.dry).toBeCloseTo(0.707, 2)
    expect(midSend.wet).toBeCloseTo(0.707, 2)
    expect(wetSend).toEqual({ dry: 0, wet: 1, out: 1 })
    expect(reverbWetOutputGain(100, 1.6)).toBeGreaterThan(0.9)
    expect(dryLevel).toBeGreaterThan(0.2)
    expect(midLevel).toBeGreaterThan(dryLevel * 0.55)
    expect(wetLevel).toBeGreaterThan(dryLevel * 0.35)
    expect(db(wetLevel / dryLevel)).toBeGreaterThan(-12)
    const tail = rms(wet, Math.floor(0.02 * SR), Math.floor(0.2 * SR))
    expect(tail).toBeGreaterThan(0.05)
  }, 30000)

  it('keeps chaos renders from a broken gain collapse on several sources', async () => {
    const dry = await render(src, baseParams({ reverbWet: 0, reverbDry: 100, reverbOutput: 100 }), 'hall')
    const dryLevel = rms(dry, from, to)
    const rand = mulberry32(23)
    const demo = renderDemoSample(SR, 5)
    const demoSlice: Pcm = {
      sampleRate: SR,
      channels: [demo.left.subarray(0, Math.floor(0.5 * SR)), demo.right.subarray(0, Math.floor(0.5 * SR))],
    }
    const sources: { name: string; pcm: Pcm }[] = [
      { name: 'noise', pcm: src },
      { name: 'sine', pcm: sine(220, 0.5, 0.45) },
      { name: 'impulse', pcm: impulse() },
      { name: 'drums', pcm: bursts() },
      { name: 'voice', pcm: voice() },
      { name: 'demo', pcm: demoSlice },
    ]
    for (const source of sources) {
      const row = planOnce(rand, true)
      const ch = await render(source.pcm, row.params, row.type === 'custom' ? 'hall' : row.type)
      const bodyFrom = source.name === 'impulse' ? Math.floor(0.008 * SR) : from
      const level = rms(ch, bodyFrom, Math.min(ch.length, to))
      const send = reverbSendLevels(row.params)
      const scaled = Math.max(send.dry * 0.45, send.wet > 0.15 ? 0.16 : 0.05) * dryLevel
      const floor = source.name === 'impulse' ? 0.02 : source.name === 'drums' || source.name === 'voice' ? scaled * 0.35 : scaled * 0.7
      expect(row.params.reverbOutput, `${source.name} ${row.type} mix ${row.params.reverbWet}`).toBe(100)
      expect(level, `${source.name} ${row.type} mix ${row.params.reverbWet.toFixed(1)}`).toBeGreaterThan(floor)
    }
    const repeated = mulberry32(29)
    let worst = 0
    let worstLabel = ''
    for (let i = 0; i < 8; i++) {
      const row = planOnce(repeated, true)
      const ch = await render(src, row.params, row.type)
      const level = rms(ch, from, to)
      const drop = db(level / dryLevel)
      if (drop < worst) {
        worst = drop
        worstLabel = `${row.type} mix=${row.params.reverbWet.toFixed(1)} decay=${row.params.reverbDecay.toFixed(2)} duck=${row.params.reverbDuck.toFixed(1)}`
      }
      expect(drop, worstLabel || 'chaos').toBeGreaterThan(-15)
    }
    expect(worst).toBeGreaterThan(-15)
  }, 40000)
})

describe('reverb random integration', () => {
  it('updates the live reverb in place and restores defaults', () => {
    const engine = new AudioEngine()
    const proto = Object.getPrototypeOf(engine) as { rebuildGraph: () => Promise<void> }
    const original = proto.rebuildGraph
    let rebuilds = 0
    proto.rebuildGraph = function (this: typeof engine) {
      rebuilds += 1
      return original.call(this)
    }
    const reverbA = engine.insertModule('reverb', 0)
    const reverbB = engine.insertModule('reverb', 1)
    expect(reverbA && reverbB).toBeTruthy()
    if (!reverbA || !reverbB) return
    engine.focusEffect(reverbA)
    engine.setParam('reverbWet', 32)
    engine.setParam('reverbOutput', 100)
    engine.focusEffect(reverbB)
    engine.setParam('reverbWet', 18)
    engine.focusEffect(reverbA)
    engine.setChaos(true)
    const afterChaos = rebuilds
    const bypassed = engine.getSnapshot().chain.find((mod) => mod.instanceId === reverbA)?.bypassed
    for (let i = 0; i < 20; i++) engine.randomizeEffect('reverb')
    const next = engine.getSnapshot()
    expect(next.params.reverbOutput).toBe(100)
    expect(next.params.reverbDry + next.params.reverbWet).toBeCloseTo(100, 4)
    expect(next.chain.find((mod) => mod.instanceId === reverbA)?.bypassed).toBe(bypassed)
    expect(rebuilds).toBe(afterChaos)
    engine.focusEffect(reverbB)
    expect(engine.getSnapshot().params.reverbWet).toBe(18)
    engine.focusEffect(reverbA)
    engine.resetEffect('reverb')
    const restored = engine.getSnapshot().params
    expect(restored.reverbOutput).toBe(PARAMS.reverbOutput.defaultValue)
    expect(restored.reverbWet).toBe(PARAMS.reverbWet.defaultValue)
    expect(restored.reverbDry).toBe(PARAMS.reverbDry.defaultValue)
    expect(engine.getSnapshot().reverbType).toBe('hall')
    const saved = JSON.parse(JSON.stringify(next.params)) as Record<string, number>
    expect(saved.dryGain).toBeUndefined()
    expect(saved.wetGain).toBeUndefined()
    expect(saved.reverbOutput).toBe(100)
  })

  it('follows automation, random offset, and LFO as one mix', () => {
    const manual = baseParams({ reverbWet: 40, reverbDry: 60 })
    const normalized = toNormalized(40, PARAMS.reverbWet)
    const automation = ensureAutomationLane(defaultAutomation(), 'reverbWet', normalized, 4)
    const lfos = defaultFxLfos()
    lfos.reverb[0] = { rateHz: 0.5, shape: 'sine', depth: 0, target: 'reverbWet', enabled: true }
    const offsets = { reverbWet: 0.12 }
    const heard = resolvePerformanceParams(manual, automation, 0.2, true, lfos, 0, defaultLfoHold(), undefined, offsets)
    expect(heard.reverbDry + heard.reverbWet).toBeCloseTo(100, 4)
    const send = reverbSendLevels(heard)
    const law = equalPowerDryWet(heard.reverbWet / 100)
    expect(send.dry).toBeCloseTo(law.dry, 5)
    expect(send.wet).toBeCloseTo(law.wet, 5)
    lfos.reverb[0] = { rateHz: 1, shape: 'sine', depth: 30, target: 'reverbWet', enabled: true }
    const moving = resolvePerformanceParams(manual, automation, 0.2, true, lfos, 0.1, defaultLfoHold(), () => 0.2, offsets)
    expect(moving.reverbDry + moving.reverbWet).toBeCloseTo(100, 4)
    expect(reverbSendLevels(moving).wet).toBeCloseTo(equalPowerDryWet(moving.reverbWet / 100).wet, 5)
  })

  it('does not grow convolver nodes when the impulse is replaced', () => {
    const ctx = new OfflineAudioContext(2, SR, SR)
    let convolvers = 0
    const original = ctx.createConvolver.bind(ctx)
    ctx.createConvolver = () => {
      convolvers += 1
      return original()
    }
    const wet = ctx.createGain()
    const output = ctx.createGain()
    const dryTap = ctx.createGain()
    const graph = createReverbGraph(ctx, wet, output, dryTap)
    expect(convolvers).toBe(2)
    expect(graph.conv.a.normalize).toBe(false)
    expect(graph.conv.b.normalize).toBe(false)
    const params = baseParams()
    for (let i = 0; i < 20; i++) {
      params.reverbSize = 20 + i
      params.reverbDecay = 0.4 + i * 0.05
      const buffer = buildReverbBuffer(ctx, params, i % 2 === 0 ? 'hall' : 'room')
      setConvolverPairBuffer(graph.conv, buffer, i * 0.05)
      applyReverbGraph(graph, params, 'hall', 120, i * 0.05, 0.02)
    }
    expect(convolvers).toBe(2)
    expect(graph.out.gain.value).toBeGreaterThan(0.5)
  })
})
