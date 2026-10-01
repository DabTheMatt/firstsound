import { describe, expect, it, vi } from 'vitest'
import { AudioEngine } from '../engine/AudioEngine'
import {
  defaultAutomation,
  envelopeToParam,
  parseAutomation,
  removeAutomationLane,
  type AutomationDocument,
} from '../automation/automation'
import {
  applyFxLfos,
  defaultFxLfos,
  defaultLfoHold,
  modulateParam,
  parseFxLfos,
  type FxLfoKind,
  type FxLfoMap,
} from '../fx/lfo'
import { defaultParamValues, PARAMS } from './definitions'
import {
  automatedCenterValue,
  automationOwnsCenter,
  describeParamModulation,
  modulationCenterValue,
  readParamModulation,
  resolvePerformance,
  resolvePerformanceParams,
} from './evaluation'
import { pitchRatio, toNormalized } from './mapping'
import type { ParamId } from './types'

function flat(id: ParamId, normalized: number): AutomationDocument {
  return {
    selectedParamId: id,
    lanes: [{ paramId: id, nodes: [{ id: 'n', time: 0, value: normalized }] }],
  }
}

function ramp(id: ParamId, from: number, to: number): AutomationDocument {
  return {
    selectedParamId: id,
    lanes: [
      {
        paramId: id,
        nodes: [
          { id: 'a', time: 0, value: from },
          { id: 'b', time: 1, value: to },
        ],
      },
    ],
  }
}

function lfoOn(kind: FxLfoKind, id: ParamId, depth: number): FxLfoMap {
  const lfos = defaultFxLfos()
  lfos[kind][0] = { rateHz: 1, shape: 'sine', depth, target: id }
  return lfos
}

describe('automation and LFO share one center', () => {
  it('orbits a 4 kHz automated cutoff instead of the 2 kHz base', () => {
    const manual = defaultParamValues()
    manual.filterCutoff = 2000
    const lfos = lfoOn('filter', 'filterCutoff', 20)
    const view = describeParamModulation(
      manual,
      flat('filterCutoff', toNormalized(4000, PARAMS.filterCutoff)),
      0,
      true,
      lfos,
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    expect(view.baseValue).toBe(2000)
    expect(view.automationActive).toBe(true)
    expect(view.centerValue).toBeCloseTo(4000, 4)
    expect(view.lfoOutput).toBeCloseTo(1)
    expect(view.finalValue).toBeCloseTo(modulateParam(view.centerValue, 'filterCutoff', 1, 20))
    expect(view.finalValue).not.toBeCloseTo(modulateParam(2000, 'filterCutoff', 1, 20))
    expect(view.offsetNorm).toBeCloseTo(view.depthNorm)
    expect(view.finalValue).toBeGreaterThanOrEqual(PARAMS.filterCutoff.min)
    expect(view.finalValue).toBeLessThanOrEqual(PARAMS.filterCutoff.max)
  })

  it('keeps the LFO on a moving automation center', () => {
    const manual = defaultParamValues()
    manual.filterCutoff = 2000
    const from = toNormalized(500, PARAMS.filterCutoff)
    const to = toNormalized(8000, PARAMS.filterCutoff)
    const doc = ramp('filterCutoff', from, to)
    const lfos = lfoOn('filter', 'filterCutoff', 20)
    let previous = 0
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const center = envelopeToParam('filterCutoff', from + (to - from) * t)
      const peak = describeParamModulation(manual, doc, t, true, lfos, 0.25, defaultLfoHold(), 'filterCutoff')
      const zero = describeParamModulation(manual, doc, t, true, lfos, 0, defaultLfoHold(), 'filterCutoff')
      expect(peak.centerValue).toBeCloseTo(center, 4)
      expect(peak.baseValue).toBe(2000)
      expect(peak.finalValue).toBeCloseTo(modulateParam(center, 'filterCutoff', 1, 20), 4)
      expect(zero.finalValue).toBeCloseTo(center, 4)
      expect(peak.finalValue).toBeGreaterThanOrEqual(PARAMS.filterCutoff.min)
      expect(peak.finalValue).toBeLessThanOrEqual(PARAMS.filterCutoff.max)
      if (i > 0) expect(peak.centerValue).toBeGreaterThan(previous)
      previous = peak.centerValue
    }
  })

  it('uses the base when automation is absent and keeps automation when the LFO is removed', () => {
    const manual = defaultParamValues()
    manual.filterCutoff = 2000
    const doc = flat('filterCutoff', toNormalized(4000, PARAMS.filterCutoff))
    const lfos = lfoOn('filter', 'filterCutoff', 20)
    const both = describeParamModulation(manual, doc, 0, true, lfos, 0.25, defaultLfoHold(), 'filterCutoff')
    const automationOnly = describeParamModulation(
      manual,
      doc,
      0,
      true,
      defaultFxLfos(),
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    const lfoOnly = describeParamModulation(
      manual,
      defaultAutomation(),
      0,
      true,
      lfos,
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    expect(automationOnly.finalValue).toBeCloseTo(both.centerValue, 4)
    expect(automationOnly.centerValue).toBeCloseTo(both.centerValue, 4)
    expect(lfoOnly.centerValue).toBeCloseTo(2000, 4)
    expect(lfoOnly.finalValue).toBeCloseTo(modulateParam(2000, 'filterCutoff', 1, 20), 4)
    expect(lfoOnly.automationActive).toBe(false)
    expect(manual.filterCutoff).toBe(2000)
  })

  it('ignores a manual edit while automation owns the center', () => {
    const manual = defaultParamValues()
    manual.filterCutoff = 2000
    const doc = flat('filterCutoff', toNormalized(4000, PARAMS.filterCutoff))
    const lfos = lfoOn('filter', 'filterCutoff', 20)
    const edited = { ...manual, filterCutoff: 1800 }
    const view = describeParamModulation(edited, doc, 0, true, lfos, 0, defaultLfoHold(), 'filterCutoff')
    expect(view.baseValue).toBe(1800)
    expect(view.centerValue).toBeCloseTo(4000, 4)
    expect(view.finalValue).toBeCloseTo(4000, 4)
    expect(automationOwnsCenter(doc, 'filterCutoff', false)).toBe(false)
    const stopped = describeParamModulation(edited, doc, 0, false, lfos, 0.25, defaultLfoHold(), 'filterCutoff')
    expect(stopped.centerValue).toBeCloseTo(1800, 4)
    expect(stopped.finalValue).toBeCloseTo(modulateParam(1800, 'filterCutoff', 1, 20), 4)
  })

  it('fits the LFO at the minimum and maximum so the value stays inside the parameter', () => {
    const manual = defaultParamValues()
    const lfos = lfoOn('filter', 'filterCutoff', 100)
    const atMin = describeParamModulation(
      manual,
      flat('filterCutoff', 0),
      0,
      true,
      lfos,
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    const atMax = describeParamModulation(
      manual,
      flat('filterCutoff', 1),
      0,
      true,
      lfos,
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    expect(atMin.finalValue).toBeCloseTo(PARAMS.filterCutoff.min, 4)
    expect(atMin.depthNorm).toBe(0)
    expect(atMax.finalValue).toBeCloseTo(PARAMS.filterCutoff.max, 4)
    expect(atMax.depthNorm).toBe(0)

    const nearMin = flat('filterCutoff', 0.04)
    let previous = -1
    let largestStep = 0
    for (let i = 0; i <= 32; i++) {
      const view = describeParamModulation(manual, nearMin, 0, true, lfos, i / 32, defaultLfoHold(), 'filterCutoff')
      expect(view.finalValue).toBeGreaterThanOrEqual(PARAMS.filterCutoff.min)
      expect(view.finalValue).toBeLessThanOrEqual(PARAMS.filterCutoff.max)
      expect(view.rangeNorm.min).toBeGreaterThanOrEqual(0)
      expect(view.rangeNorm.max).toBeLessThanOrEqual(1)
      const norm = toNormalized(view.finalValue, PARAMS.filterCutoff)
      if (i > 0) largestStep = Math.max(largestStep, Math.abs(norm - previous))
      previous = norm
    }
    expect(largestStep).toBeLessThan(0.05)
  })

  it('does not let an LFO on Dry replace an automated Wet center', () => {
    const manual = defaultParamValues()
    manual.delayCorrelate = 1
    manual.delayWet = 10
    manual.delayDry = 90
    const lfos = defaultFxLfos()
    lfos.delay[0] = { rateHz: 1, shape: 'sine', depth: 40, target: 'delayDry' }
    const view = describeParamModulation(
      manual,
      flat('delayWet', 0.8),
      0,
      true,
      lfos,
      0.25,
      defaultLfoHold(),
      'delayWet',
    )
    expect(view.centerValue).toBeCloseTo(80, 4)
    expect(view.finalValue).toBeCloseTo(80, 4)
    const resolved = resolvePerformance(manual, flat('delayWet', 0.8), 0, true, lfos, 0.25, defaultLfoHold())
    expect(resolved.values.delayWet).toBeCloseTo(80, 4)
    expect(resolved.values.delayDry).toBeCloseTo(20, 4)
    expect(resolved.centers.delayWet).toBeCloseTo(80, 4)
  })

  it('matches a lone LFO pass, including linked Dry/Wet', () => {
    const manual = defaultParamValues()
    manual.delayCorrelate = 1
    manual.delayWet = 40
    manual.delayDry = 60
    const lfos = lfoOn('delay', 'delayWet', 30)
    const direct = applyFxLfos(manual, lfos, 0.25, defaultLfoHold())
    const unified = resolvePerformanceParams(manual, defaultAutomation(), 0, true, lfos, 0.25, defaultLfoHold())
    expect(unified.delayWet).toBeCloseTo(direct.delayWet, 6)
    expect(unified.delayDry).toBeCloseTo(direct.delayDry, 6)
  })
})

describe('parameter mapping domains', () => {
  const cases: { id: ParamId; kind: 'log' | 'linear' | 'bipolar'; center: number }[] = [
    { id: 'filterCutoff', kind: 'log', center: 1000 },
    { id: 'eq1Freq', kind: 'log', center: 400 },
    { id: 'delayTime', kind: 'log', center: 250 },
    { id: 'filterReso', kind: 'log', center: 1 },
    { id: 'eq1Q', kind: 'log', center: 1.2 },
    { id: 'gain', kind: 'linear', center: -6 },
    { id: 'eq1Gain', kind: 'linear', center: 3 },
    { id: 'delayWet', kind: 'linear', center: 40 },
    { id: 'reverbWet', kind: 'linear', center: 35 },
    { id: 'pan', kind: 'bipolar', center: 0 },
    { id: 'pitch', kind: 'bipolar', center: 0 },
    { id: 'grainPitch', kind: 'bipolar', center: 0 },
  ]

  it('modulates each family in its own domain and stays inside the range', () => {
    for (const item of cases) {
      const def = PARAMS[item.id]
      const up = modulateParam(item.center, item.id, 1, 12)
      const down = modulateParam(item.center, item.id, -1, 12)
      expect(up).toBeGreaterThan(item.center)
      expect(down).toBeLessThan(item.center)
      expect(up).toBeLessThanOrEqual(def.max)
      expect(down).toBeGreaterThanOrEqual(def.min)
      const upSpan = Math.abs(up - item.center)
      const downSpan = Math.abs(item.center - down)
      if (item.kind === 'log') expect(upSpan).not.toBeCloseTo(downSpan, 1)
      else expect(upSpan).toBeCloseTo(downSpan, 4)
    }
  })

  it('keeps pitch modulation in equal semitone steps', () => {
    const up = modulateParam(0, 'pitch', 1, 10)
    const down = modulateParam(0, 'pitch', -1, 10)
    expect(up).toBeCloseTo(-down, 4)
    expect(pitchRatio(up)).toBeCloseTo(1 / pitchRatio(down), 4)
  })

  it('applies the same center rule to EQ frequency, gain, and Q', () => {
    const manual = defaultParamValues()
    manual.eq1Freq = 200
    manual.eq1Gain = 0
    manual.eq1Q = 1
    const specs: { id: ParamId; kind: keyof FxLfoMap; normalized: number }[] = [
      { id: 'eq1Freq', kind: 'eq1', normalized: toNormalized(2000, PARAMS.eq1Freq) },
      { id: 'eq1Gain', kind: 'eq1', normalized: toNormalized(6, PARAMS.eq1Gain) },
      { id: 'eq1Q', kind: 'eq1', normalized: toNormalized(4, PARAMS.eq1Q) },
    ]
    for (const spec of specs) {
      const lfos = lfoOn(spec.kind, spec.id, 18)
      const view = describeParamModulation(
        manual,
        flat(spec.id, spec.normalized),
        0,
        true,
        lfos,
        0.25,
        defaultLfoHold(),
        spec.id,
      )
      const center = envelopeToParam(spec.id, spec.normalized)
      expect(view.centerValue).toBeCloseTo(center, 4)
      expect(view.finalValue).toBeCloseTo(modulateParam(center, spec.id, 1, 18), 4)
      expect(view.finalValue).not.toBeCloseTo(modulateParam(manual[spec.id], spec.id, 1, 18), 3)
      expect(view.rangeValue.min).toBeGreaterThanOrEqual(PARAMS[spec.id].min - 1e-6)
      expect(view.rangeValue.max).toBeLessThanOrEqual(PARAMS[spec.id].max + 1e-6)
    }
  })
})

describe('selectors', () => {
  it('reads published stages without sampling audio', () => {
    const live = readParamModulation('filterCutoff', 2000, 4000, 5200, 20, true, 1)
    expect(live.baseValue).toBe(2000)
    expect(live.centerValue).toBeCloseTo(4000, 4)
    expect(live.finalValue).toBe(5200)
    expect(live.rangeNorm.max).toBeGreaterThan(live.centerNorm)
    expect(live.offsetNorm).toBeCloseTo(live.depthNorm)
    const stored = readParamModulation('filterCutoff', 2000, 4000, 2100, 20, false, 1)
    expect(stored.centerValue).toBe(2000)
    expect(modulationCenterValue('filterCutoff', 2000, 4000, flat('filterCutoff', 0.5), false)).toBe(2000)
    expect(automatedCenterValue(2000, 'filterCutoff', flat('filterCutoff', toNormalized(4000, PARAMS.filterCutoff)), 0, true)).toBeCloseTo(
      4000,
      4,
    )
  })
})

describe('engine ownership', () => {
  it('keeps the unrelated source when automation or the LFO is removed, and survives bypass and reload', () => {
    const normalized = toNormalized(4000, PARAMS.filterCutoff)
    const engine = new AudioEngine()
    engine.setParam('filterCutoff', 2000)
    engine.replaceAutomation(flat('filterCutoff', normalized))
    engine.setFxLfo('filter', 0, { target: 'filterCutoff', depth: 0, rateHz: 0.5, shape: 'sine' })

    engine.setParam('filterCutoff', 1800)
    let snap = engine.getSnapshot()
    expect(snap.params.filterCutoff).toBeCloseTo(1800, 4)
    expect(snap.paramCenters.filterCutoff).toBeCloseTo(1800, 4)
    expect(snap.automation.lanes[0]?.nodes[0]?.value).toBeCloseTo(normalized, 5)
    const whilePlaying = describeParamModulation(
      snap.params,
      snap.automation,
      0,
      true,
      lfoOn('filter', 'filterCutoff', 30),
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    expect(whilePlaying.baseValue).toBeCloseTo(1800, 4)
    expect(whilePlaying.centerValue).toBeCloseTo(4000, 4)

    engine.setFxLfo('filter', 0, { target: null })
    snap = engine.getSnapshot()
    expect(snap.automation.lanes.map((lane) => lane.paramId)).toEqual(['filterCutoff'])
    expect(snap.fxLfos.filter[0]?.target).toBeNull()
    expect(snap.params.filterCutoff).toBeCloseTo(1800, 4)

    engine.setFxLfo('filter', 0, { target: 'filterCutoff', depth: 0, rateHz: 0.5, shape: 'sine' })
    engine.removeAutomation('filterCutoff')
    snap = engine.getSnapshot()
    expect(snap.automation.lanes).toEqual([])
    expect(snap.fxLfos.filter[0]?.target).toBe('filterCutoff')
    expect(snap.params.filterCutoff).toBeCloseTo(1800, 4)

    const active = lfoOn('filter', 'filterCutoff', 30)
    const doc = flat('filterCutoff', normalized)
    expect(removeAutomationLane(doc, 'filterCutoff').lanes).toEqual([])
    expect(active.filter[0]?.target).toBe('filterCutoff')
    expect(active.filter[0]?.depth).toBe(30)

    engine.replaceAutomation(doc)
    const id = engine.ensureModule('filter')
    expect(id).toBeTruthy()
    engine.setModuleBypass(id!, true)
    snap = engine.getSnapshot()
    expect(snap.chain.find((mod) => mod.instanceId === id)?.bypassed).toBe(true)
    expect(snap.fxLfos.filter[0]?.target).toBe('filterCutoff')
    expect(snap.automation.lanes[0]?.paramId).toBe('filterCutoff')
    engine.setModuleBypass(id!, false)
    expect(engine.getSnapshot().automation.lanes).toHaveLength(1)
    expect(engine.getSnapshot().fxLfos.filter[0]?.target).toBe('filterCutoff')

    const preset = engine.toPreset()
    preset.fxLfos = active
    vi.stubGlobal('window', { setInterval: () => 1, clearInterval: () => {} })
    const restored = new AudioEngine()
    restored.applyPreset(preset)
    const loaded = restored.getSnapshot()
    expect(loaded.params.filterCutoff).toBeCloseTo(1800, 4)
    expect(loaded.fxLfos.filter[0]?.target).toBe('filterCutoff')
    expect(loaded.fxLfos.filter[0]?.depth).toBe(30)
    const again = describeParamModulation(
      loaded.params,
      loaded.automation,
      0,
      true,
      loaded.fxLfos,
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    expect(again.centerValue).toBeCloseTo(4000, 4)
    expect(again.finalValue).toBeCloseTo(modulateParam(again.centerValue, 'filterCutoff', 1, 30), 4)

    const reparsed = describeParamModulation(
      loaded.params,
      parseAutomation(JSON.parse(JSON.stringify(loaded.automation))),
      0,
      true,
      parseFxLfos(JSON.parse(JSON.stringify(loaded.fxLfos))),
      0.25,
      defaultLfoHold(),
      'filterCutoff',
    )
    expect(reparsed.finalValue).toBeCloseTo(again.finalValue, 4)
  })
})
