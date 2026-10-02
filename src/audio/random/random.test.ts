import { beforeEach, describe, expect, it, vi } from 'vitest'
import { insertAutomationNode, resolvePerformanceParams, selectAutomationParam, defaultAutomation } from '../automation/automation'
import { defaultParamValues, PARAMS } from '../parameters/definitions'
import { AudioEngine } from '../engine/AudioEngine'
import { defaultEqBandAt } from '../engine/eqBands'
import { defaultFxLfos, defaultLfoHold } from '../fx/lfo'
import { isRandomizable, randomParamValue, randomWindow, randomizeEqBandPatch } from './distributions'
import { generateRandomEqBands, resolveEqFilterCount, separateCutFilters } from './eqGenerate'
import { participatingTargets } from './groups'
import { randomLfoDepth, randomLfoPatch, randomLfoRate } from './lfoRandom'
import { commitDspGesture } from '../../app/dspHistory'
import { createHistory } from '../../app/history'
import { captureDsp } from '../../sensory/applySensory'
import { lfoBinding } from '../fx/lfo'
import { getEqBandSelection } from '../engine/eqBandSelection'
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
    ...defaultRandomDocument(),
    chaos: true,
    generators: { [id]: { ...defaultParamRandom(), auto: true, ...patch } },
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
    const doc: RandomDocument = { ...defaultRandomDocument(), chaos: true, generators }
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

  it('draws interpolation only from the legal algorithms', () => {
    const rand = mulberry32(4)
    const values = new Set<number>()
    for (let i = 0; i < 24; i++) {
      values.add(randomParamValue({ id: 'stretchInterpAlgo', current: 1, intensity: 1, chaos: true, rand }))
    }
    expect(values.size).toBeGreaterThan(1)
    for (const value of values) expect([0, 1, 2]).toContain(value)
    expect(isRandomizable('stretchInterpAlgo')).toBe(true)
    expect(isRandomizable('makeMono')).toBe(false)
  })

  it('includes reverb type in the effect catalog and keeps freeze out', () => {
    const ids = participatingTargets(defaultRandomDocument(), 'reverb')
    expect(ids).toContain('reverbNote')
    expect(ids).not.toContain('reverbFreeze')
    expect(ids).not.toContain('reverbSync')
  })
})

describe('modulation random', () => {
  it('rewrites rate, depth, and shape on the existing slot', () => {
    const engine = new AudioEngine()
    engine.setFxLfo('input', 0, { target: 'gain', rateHz: 0.6, depth: 20, shape: 'sine', enabled: true })
    const before = engine.getSnapshot().fxLfos.input.filter((slot) => slot.target === 'gain')
    expect(before).toHaveLength(1)
    let changed = false
    for (let i = 0; i < 8; i++) {
      engine.randomizeParameterLfo('gain')
      const slot = lfoBinding(engine.getSnapshot().fxLfos, 'gain')
      expect(slot?.slot).toBe(0)
      expect(slot?.lfo.target).toBe('gain')
      expect(engine.getSnapshot().fxLfos.input.filter((item) => item.target === 'gain')).toHaveLength(1)
      if (!slot) continue
      if (slot.lfo.rateHz !== 0.6 || slot.lfo.depth !== 20 || slot.lfo.shape !== 'sine') changed = true
      expect(slot.lfo.depth).toBeGreaterThanOrEqual(0)
      expect(slot.lfo.depth).toBeLessThanOrEqual(100)
      expect(slot.lfo.rateHz).toBeGreaterThan(0)
      expect(slot.lfo.rateHz).toBeLessThanOrEqual(20)
    }
    expect(changed).toBe(true)
  })

  it('keeps free rate and depth in a musical window', () => {
    const rand = mulberry32(9)
    const rates = Array.from({ length: 40 }, () => randomLfoRate(false, 0.5, rand))
    const depths = Array.from({ length: 40 }, () => randomLfoDepth(false, 0.5, rand))
    expect(Math.max(...rates)).toBeLessThanOrEqual(8)
    expect(Math.min(...rates)).toBeGreaterThanOrEqual(0.12)
    expect(Math.max(...depths)).toBeLessThanOrEqual(100)
    expect(Math.min(...depths)).toBeGreaterThan(0)
    const patch = randomLfoPatch({
      lfo: { rateHz: 1, depth: 10, shape: 'sine', target: 'gain', enabled: true },
      fields: ['shape'],
      chaos: false,
      intensity: 0.5,
      rand,
    })
    expect(patch.target).toBeUndefined()
    expect(['triangle', 'square', 'saw', 'snh']).toContain(patch.shape)
  })
})

describe('generative EQ', () => {
  it('builds 1–6 valid filters sorted low to high with stable ids', () => {
    const rand = mulberry32(21)
    for (let i = 0; i < 12; i++) {
      const count = resolveEqFilterCount('random', rand)
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(6)
      const bands = generateRandomEqBands({ count, chaos: false, rand, createId: () => `band-${i}-${bandsSeq(i)}` })
      expect(bands).toHaveLength(count)
      const ids = new Set(bands.map((band) => band.id))
      expect(ids.size).toBe(count)
      for (let n = 1; n < bands.length; n++) {
        expect(bands[n]!.frequency).toBeGreaterThanOrEqual(bands[n - 1]!.frequency)
      }
      for (const band of bands) {
        expect(band.type).not.toBe('off')
        expect(band.frequency).toBeGreaterThan(20)
        expect(band.q).toBeGreaterThanOrEqual(0.1)
        expect(band.q).toBeLessThanOrEqual(20)
        if (band.type === 'lowpass' || band.type === 'highpass' || band.type === 'notch' || band.type === 'bandpass') {
          expect(band.gain).toBe(0)
        } else {
          expect(Math.abs(band.gain)).toBeLessThanOrEqual(18)
        }
      }
    }
  })

  it('does not routinely pair a high-pass above a low-pass', () => {
    const rand = mulberry32(8)
    let bad = 0
    let paired = 0
    for (let i = 0; i < 120; i++) {
      const bands = generateRandomEqBands({ count: 4, chaos: false, rand })
      const hp = bands.find((band) => band.type === 'highpass')
      const lp = bands.find((band) => band.type === 'lowpass')
      if (!hp || !lp) continue
      paired += 1
      if (hp.frequency >= lp.frequency) bad += 1
    }
    expect(bad).toBe(0)
    expect(paired).toBeGreaterThan(0)
  })

  it('applies a whole EQ as one replacement and drops stale modulation', () => {
    const engine = new AudioEngine()
    engine.ensureModule('eq')
    engine.setChaos(true)
    engine.setEqRandom({ scope: 'whole', count: 3 })
    engine.setFxLfo('eq1', 0, { target: 'eq1Freq', depth: 40, rateHz: 1, shape: 'sine', enabled: true })
    const beforeId = engine.getSnapshot().eqBands[0]?.id
    const proto = Object.getPrototypeOf(engine) as { rebuildGraph: () => Promise<void> }
    const original = proto.rebuildGraph
    let rebuilds = 0
    proto.rebuildGraph = function (this: typeof engine) {
      rebuilds += 1
      return original.call(this)
    }
    const picked = engine.generateRandomEq()
    const bands = engine.getSnapshot().eqBands.filter((band) => band.type !== 'off')
    expect(bands.length).toBe(3)
    expect(picked).toBeGreaterThanOrEqual(0)
    for (let n = 1; n < bands.length; n++) expect(bands[n]!.frequency).toBeGreaterThanOrEqual(bands[n - 1]!.frequency)
    expect(bands[0]?.id).not.toBe(beforeId)
    expect(lfoBinding(engine.getSnapshot().fxLfos, 'eq1Freq')).toBeNull()
    expect(rebuilds).toBe(0)
    expect(getEqBandSelection()?.index).toBe(picked)
  })

  it('undoes a whole EQ as one history step', () => {
    const engine = new AudioEngine()
    engine.ensureModule('eq')
    engine.setEqBand(0, { type: 'peaking', frequency: 400, gain: 3, q: 1 })
    const before = captureDsp(engine)
    engine.setEqRandom({ count: 4 })
    engine.generateRandomEq()
    const after = captureDsp(engine)
    type Hist = { layer: string; dsp?: typeof before; mark: string }
    let history = createHistory<Hist>({ layer: 'region', mark: 'start' })
    history = commitDspGesture(history, before, after, (a, b) => a.mark === b.mark && a.layer === b.layer && a.dsp === b.dsp)
    expect(history.past).toHaveLength(1)
    expect(history.present.dsp?.eqBands.filter((band) => band.type !== 'off').length).toBe(4)
    const undone = history.past[0]
    expect(undone?.dsp?.eqBands[0]?.frequency).toBeCloseTo(400, 0)
  })
})

let seq = 0
function bandsSeq(_i: number): string {
  seq += 1
  return seq.toString(36)
}

describe('eq separation helper', () => {
  it('pulls a contradictory high-pass back below the low-pass', () => {
    const bands = [
      { id: 'a', type: 'highpass' as const, frequency: 15000, gain: 0, q: 0.7, slope: 24 as const },
      { id: 'b', type: 'lowpass' as const, frequency: 80, gain: 0, q: 0.7, slope: 24 as const },
    ]
    separateCutFilters(bands, false, mulberry32(1))
    expect(bands[0]!.frequency).toBeLessThan(bands[1]!.frequency)
  })
})
