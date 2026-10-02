import { beforeEach, describe, expect, it, vi } from 'vitest'
import { insertAutomationNode, resolvePerformanceParams, selectAutomationParam, defaultAutomation } from '../automation/automation'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { AudioEngine } from '../engine/AudioEngine'
import { defaultEqBandAt } from '../engine/eqBands'
import { defaultFxLfos, defaultLfoHold } from '../fx/lfo'
import { isRandomizable, randomParamValue, randomWindow, randomizeEqBandPatch } from './distributions'
import { participatingTargets } from './groups'
import { mulberry32 } from './rng'
import { randomBudgetScale, randomIntervalSec, stepRandom } from './schedule'
import { defaultParamRandom, defaultRandomDocument, defaultRandomRuntime, type RandomDocument } from './types'

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

function docWith(id: 'gain' | 'filterCutoff', patch: Partial<ReturnType<typeof defaultParamRandom>>): RandomDocument {
  return {
    chaos: true,
    generators: { [id]: { ...defaultParamRandom(), auto: true, ...patch } },
    participation: {},
  }
}

describe('parameter-aware random', () => {
  it('draws frequency in a log-safe window', () => {
    const rand = mulberry32(3)
    const values = Array.from({ length: 40 }, () =>
      randomParamValue({ id: 'filterCutoff', current: 1000, intensity: 1, chaos: false, rand }),
    )
    const window = randomWindow('filterCutoff', false)
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(window.min)
      expect(value).toBeLessThanOrEqual(window.max)
      expect(Number.isFinite(value)).toBe(true)
    }
    const logMean = Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length)
    const linearMid = (window.min + window.max) / 2
    expect(Math.abs(Math.log(logMean) - Math.log(Math.sqrt(window.min * window.max)))).toBeLessThan(
      Math.abs(Math.log(linearMid) - Math.log(Math.sqrt(window.min * window.max))),
    )
  })

  it('keeps gain, output, feedback, wet, pan, Q, pitch, and delay inside safe ranges', () => {
    const rand = mulberry32(9)
    const gain = Array.from({ length: 30 }, () => randomParamValue({ id: 'gain', current: -3, intensity: 1, chaos: false, rand }))
    const output = Array.from({ length: 20 }, () =>
      randomParamValue({ id: 'outputGain', current: 0, intensity: 1, chaos: true, rand }),
    )
    const feedback = Array.from({ length: 20 }, () =>
      randomParamValue({ id: 'delayFeedback', current: 20, intensity: 1, chaos: true, rand }),
    )
    const wet = Array.from({ length: 20 }, () => randomParamValue({ id: 'reverbWet', current: 40, intensity: 1, chaos: false, rand }))
    const pan = Array.from({ length: 20 }, () => randomParamValue({ id: 'pan', current: 0, intensity: 1, chaos: true, rand }))
    const q = Array.from({ length: 20 }, () => randomParamValue({ id: 'filterReso', current: 0.8, intensity: 1, chaos: false, rand }))
    const pitch = Array.from({ length: 20 }, () => randomParamValue({ id: 'pitch', current: 0, intensity: 0.5, chaos: false, rand }))
    const delay = Array.from({ length: 20 }, () =>
      randomParamValue({ id: 'delayTime', current: 300, intensity: 1, chaos: false, rand, bpm: 120 }),
    )
    expect(Math.max(...gain)).toBeLessThanOrEqual(randomWindow('gain', false).max)
    expect(Math.min(...gain)).toBeGreaterThanOrEqual(randomWindow('gain', false).min)
    expect(Math.max(...output)).toBeLessThanOrEqual(6)
    expect(Math.min(...output)).toBeGreaterThanOrEqual(-18)
    expect(Math.max(...feedback)).toBeLessThanOrEqual(80)
    expect(Math.max(...feedback)).toBeLessThan(PARAMS.delayFeedback.max)
    expect(Math.max(...wet)).toBeLessThanOrEqual(85)
    expect(Math.min(...wet)).toBeGreaterThanOrEqual(10)
    for (const value of pan) {
      expect(value).toBeGreaterThanOrEqual(-100)
      expect(value).toBeLessThanOrEqual(100)
    }
    expect(Math.max(...q)).toBeLessThanOrEqual(4)
    for (const value of pitch) expect(Math.abs(value)).toBeLessThanOrEqual(7)
    expect(Math.max(...delay)).toBeLessThanOrEqual(1200)
    expect(Math.min(...delay)).toBeGreaterThanOrEqual(40)
    expect(isRandomizable('delayFreeze')).toBe(false)
    expect(isRandomizable('makeMono')).toBe(false)
  })

  it('lets low intensity stay nearer the current gain than the safe edge', () => {
    const rand = mulberry32(4)
    const near = Array.from({ length: 40 }, () => randomParamValue({ id: 'gain', current: -3, intensity: 0.05, chaos: false, rand }))
    const span = Math.max(...near) - Math.min(...near)
    expect(span).toBeLessThan(12)
  })
})

describe('random scheduler', () => {
  it('uses free 2 Hz and tempo 1/16 from the shared clock', () => {
    expect(randomIntervalSec({ ...defaultParamRandom(), sync: 'free', rateHz: 2 }, 120)).toBeCloseTo(0.5)
    expect(randomIntervalSec({ ...defaultParamRandom(), sync: 'tempo', division: '1/16' }, 120)).toBeCloseTo(0.125)
    expect(randomIntervalSec({ ...defaultParamRandom(), sync: 'tempo', division: '1/16' }, 60)).toBeCloseTo(0.25)
  })

  it('freezes while paused and continues after resume', () => {
    const doc = docWith('gain', { sync: 'free', rateHz: 2, transition: 'step' })
    const params = defaultParamValues()
    const armed = stepRandom({
      doc,
      runtime: defaultRandomRuntime(),
      offsets: {},
      params,
      automation: defaultAutomation(),
      playing: true,
      clockSec: 1,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(1),
    })
    expect(armed.writes).toHaveLength(0)
    const paused = stepRandom({
      doc,
      runtime: armed.runtime,
      offsets: {},
      params,
      automation: defaultAutomation(),
      playing: false,
      clockSec: 5,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(1),
    })
    expect(paused.writes).toHaveLength(0)
    expect(paused.runtime.lastSec.gain).toBe(1)
    const early = stepRandom({
      doc,
      runtime: paused.runtime,
      offsets: {},
      params,
      automation: defaultAutomation(),
      playing: true,
      clockSec: 1.4,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(2),
    })
    expect(early.writes).toHaveLength(0)
    const due = stepRandom({
      doc,
      runtime: early.runtime,
      offsets: {},
      params,
      automation: defaultAutomation(),
      playing: true,
      clockSec: 1.5,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(3),
    })
    expect(due.writes.map((write) => write.id)).toEqual(['gain'])
    expect(Number.isFinite(due.writes[0]!.value)).toBe(true)
  })

  it('follows a new tempo for the next synced event', () => {
    const doc = docWith('gain', { sync: 'tempo', division: '1/16', transition: 'step' })
    const armed = stepRandom({
      doc,
      runtime: defaultRandomRuntime(),
      offsets: {},
      params: defaultParamValues(),
      automation: defaultAutomation(),
      playing: true,
      clockSec: 0,
      transportSec: 0,
      bpm: 120,
      rand: () => 0.2,
    })
    const still = stepRandom({
      doc,
      runtime: armed.runtime,
      offsets: {},
      params: defaultParamValues(),
      automation: defaultAutomation(),
      playing: true,
      clockSec: 0.2,
      transportSec: 0,
      bpm: 60,
      rand: () => 0.2,
    })
    expect(still.writes).toHaveLength(0)
    const due = stepRandom({
      doc,
      runtime: still.runtime,
      offsets: {},
      params: defaultParamValues(),
      automation: defaultAutomation(),
      playing: true,
      clockSec: 0.25,
      transportSec: 0,
      bpm: 60,
      rand: () => 0.4,
    })
    expect(due.writes).toHaveLength(1)
  })

  it('caps a storm of generators to the event budget', () => {
    const generators: RandomDocument['generators'] = {}
    const ids = ['gain', 'pan', 'pitch', 'filterCutoff', 'filterReso', 'filterMix', 'delayTime', 'delayFeedback', 'delayWet', 'reverbWet', 'reverbSize', 'reverbDecay', 'outputGain', 'grainSize', 'density', 'scatter'] as const
    for (const id of ids) generators[id] = { ...defaultParamRandom(), auto: true, sync: 'free', rateHz: 4 }
    const doc: RandomDocument = { chaos: true, generators, participation: {} }
    expect(randomBudgetScale(doc, 120)).toBeGreaterThan(1)
    const armed = stepRandom({
      doc,
      runtime: defaultRandomRuntime(),
      offsets: {},
      params: defaultParamValues(),
      automation: defaultAutomation(),
      playing: true,
      clockSec: 0,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(8),
    })
    const early = stepRandom({
      doc,
      runtime: armed.runtime,
      offsets: {},
      params: defaultParamValues(),
      automation: defaultAutomation(),
      playing: true,
      clockSec: 0.3,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(8),
    })
    expect(early.writes).toHaveLength(0)
    expect(early.budgetLimited).toBe(true)
  })
})

describe('random ownership with automation and LFO', () => {
  it('offsets the automated center and leaves the curve and manual base alone', () => {
    const manual = defaultParamValues()
    manual.gain = -12
    const inserted = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'gain'), 0, 0.5, 4, 'gain')!
    const doc = docWith('gain', { transition: 'step', intensity: 1 })
    const armed = stepRandom({
      doc,
      runtime: defaultRandomRuntime(),
      offsets: {},
      params: manual,
      automation: inserted.doc,
      playing: true,
      clockSec: 0,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(5),
    })
    const stepped = stepRandom({
      doc,
      runtime: armed.runtime,
      offsets: {},
      params: manual,
      automation: inserted.doc,
      playing: true,
      clockSec: 1,
      transportSec: 0,
      bpm: 120,
      rand: mulberry32(6),
    })
    expect(stepped.writes).toHaveLength(0)
    expect(stepped.offsets.gain).toBeDefined()
    expect(manual.gain).toBe(-12)
    expect(inserted.doc.lanes[0]?.nodes).toHaveLength(1)
    const plain = resolvePerformanceParams(manual, inserted.doc, 0, true, defaultFxLfos(), 0, defaultLfoHold())
    const shifted = resolvePerformanceParams(
      manual,
      inserted.doc,
      0,
      true,
      defaultFxLfos(),
      0,
      defaultLfoHold(),
      undefined,
      stepped.offsets,
    )
    expect(shifted.gain).not.toBeCloseTo(plain.gain)
    expect(manual.gain).toBe(-12)
    const stopped = resolvePerformanceParams(
      manual,
      inserted.doc,
      0,
      false,
      defaultFxLfos(),
      0,
      defaultLfoHold(),
      undefined,
      stepped.offsets,
    )
    expect(stopped.gain).toBe(-12)
  })

  it('lets LFO move around the post-random center without a second writer', () => {
    const manual = defaultParamValues()
    manual.filterCutoff = 1000
    const inserted = insertAutomationNode(selectAutomationParam(defaultAutomation(), 'filterCutoff'), 0, 0.5, 2, 'f')!
    const lfos = defaultFxLfos()
    lfos.filter[0] = { rateHz: 1, shape: 'sine', depth: 40, target: 'filterCutoff', enabled: true }
    const offset = { filterCutoff: 0.08 }
    const center = resolvePerformanceParams(manual, inserted.doc, 0, true, defaultFxLfos(), 0.25, defaultLfoHold(), undefined, offset)
    const moving = resolvePerformanceParams(manual, inserted.doc, 0, true, lfos, 0.25, defaultLfoHold(), () => 0.5, offset)
    expect(moving.filterCutoff).not.toBeCloseTo(center.filterCutoff)
    expect(lfos.filter[0]?.target).toBe('filterCutoff')
    expect(lfos.filter[0]?.rateHz).toBe(1)
  })
})

describe('effect and EQ scopes', () => {
  it('randomizes reverb parameters and not bypass or routing', () => {
    const ids = participatingTargets(defaultRandomDocument(), 'reverb')
    expect(ids).toContain('reverbWet')
    expect(ids).toContain('reverbDecay')
    expect(ids).not.toContain('reverbFreeze')
    expect(ids).not.toContain('reverbSync')
  })

  it('skips gain on a lowpass and keeps a bell gain finite', () => {
    const rand = mulberry32(12)
    const low = randomizeEqBandPatch({ ...defaultEqBandAt(0), type: 'lowpass', frequency: 800, gain: 6, q: 0.7 }, 0.8, true, rand, false)
    expect(low.gain).toBe(0)
    expect(low.frequency).toBeGreaterThan(20)
    const bell = randomizeEqBandPatch({ ...defaultEqBandAt(1), type: 'peaking', frequency: 1000, gain: 0, q: 1 }, 0.8, false, mulberry32(13), false)
    expect(bell.gain).not.toBe(0)
    expect(bell.type).toBeUndefined()
  })
})

describe('engine random', () => {
  it('one-shot gain stays valid and does not rebuild the graph or touch LFO routing', () => {
    const engine = new AudioEngine()
    const proto = Object.getPrototypeOf(engine) as { rebuildGraph: () => Promise<void> }
    const original = proto.rebuildGraph
    let rebuilds = 0
    proto.rebuildGraph = function (this: typeof engine) {
      rebuilds += 1
      return original.call(this)
    }
    engine.setFxLfo('filter', 0, { rateHz: 1.25, shape: 'sine', depth: 0, target: 'filterCutoff', enabled: true })
    const seen = new Set<number>()
    for (let i = 0; i < 6; i++) seen.add(engine.getSnapshot().params.gain)
    engine.setChaos(true)
    for (let i = 0; i < 6; i++) {
      engine.randomizeParam('gain')
      seen.add(engine.getSnapshot().params.gain)
    }
    expect(seen.size).toBeGreaterThan(1)
    for (const value of seen) {
      expect(value).toBeGreaterThanOrEqual(PARAMS.gain.min)
      expect(value).toBeLessThanOrEqual(PARAMS.gain.max)
      expect(Number.isFinite(value)).toBe(true)
    }
    const slot = engine.getSnapshot().fxLfos.filter[0]!
    expect(slot.target).toBe('filterCutoff')
    expect(slot.rateHz).toBe(1.25)
    expect(slot.shape).toBe('sine')
    expect(rebuilds).toBe(0)
    expect(engine.getSnapshot().automation.lanes).toHaveLength(0)
  })

  it('restores configuration without arming a live event before play', () => {
    const first = new AudioEngine()
    first.setChaos(true)
    first.setParamRandom('gain', { auto: true, sync: 'tempo', division: '1/16', intensity: 0.3, transition: 'smooth' })
    const second = new AudioEngine()
    const gen = second.getSnapshot().random.generators.gain
    expect(second.getSnapshot().random.chaos).toBe(true)
    expect(gen?.auto).toBe(true)
    expect(gen?.division).toBe('1/16')
    expect(second.getSnapshot().params.gain).toBe(defaultParamValues().gain)
    second.resetAll()
    expect(new AudioEngine().getSnapshot().random.chaos).toBe(false)
  })

  it('asks once before enabling chaos', () => {
    const engine = new AudioEngine()
    engine.requestChaos()
    expect(engine.getSnapshot().random.prompt).toBe(true)
    expect(engine.getSnapshot().random.chaos).toBe(false)
    engine.cancelChaos()
    expect(engine.getSnapshot().random.prompt).toBe(false)
    engine.requestChaos()
    engine.confirmChaos()
    expect(engine.getSnapshot().random.chaos).toBe(true)
    engine.setChaos(false)
    engine.requestChaos()
    expect(engine.getSnapshot().random.prompt).toBe(false)
    expect(engine.getSnapshot().random.chaos).toBe(true)
  })

  it('randomizes reverb without touching delay', () => {
    const engine = new AudioEngine()
    engine.setChaos(true)
    const before = engine.getSnapshot().params
    engine.randomizeEffect('reverb')
    const next = engine.getSnapshot().params
    expect(next.delayTime).toBe(before.delayTime)
    expect(next.delayFeedback).toBe(before.delayFeedback)
    const moved = (['reverbWet', 'reverbDecay', 'reverbSize', 'reverbDamping', 'reverbPredelay'] as const).some(
      (id) => next[id] !== before[id],
    )
    expect(moved).toBe(true)
  })
})
