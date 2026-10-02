import 'node-web-audio-api/polyfill.js'
import { describe, expect, it, afterEach } from 'vitest'
import { AudioEngine } from '../../audio/engine/AudioEngine'
import { defaultAutomation, ensureAutomationLane } from '../../audio/automation/automation'
import { defaultFxLfos, LFO_DEPTH_DEFAULT } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import {
  connectParameterLfo,
  removeParameterLfo,
  setParameterLfoPrimary,
} from './modulationActions'
import { readModulationEditor, resetModulationEditors, setModulationEditorOpen } from './modulationEditor'
import {
  automationFocusLfoCue,
  eqFocusModulationFrame,
  eqFocusModulationParam,
  eqModulationGuides,
  eqModulationParamId,
  formatModulationDepth,
  modulationAffordanceModel,
  parameterModulationState,
  sliderModulationMarks,
} from './modulationModel'

afterEach(() => {
  resetModulationEditors()
})

function stubLfoClock() {
  const host = window as unknown as {
    setInterval: typeof setInterval
    clearInterval: typeof clearInterval
  }
  host.setInterval = (() => 1) as typeof setInterval
  host.clearInterval = (() => undefined) as typeof clearInterval
}

function cutoffState(editorOpen: boolean, lfos = defaultFxLfos(), automation = defaultAutomation()) {
  return parameterModulationState({
    lfos,
    automation,
    paramId: 'filterCutoff',
    baseNormalized: toNormalized(PARAMS.filterCutoff.defaultValue, PARAMS.filterCutoff),
    editorOpen,
  })
}

describe('parameter modulation state', () => {
  it('keeps the editor apart from LFO connection', () => {
    const closed = cutoffState(false)
    expect(closed.supportsModulation).toBe(true)
    expect(closed.sources).toEqual(['lfo', 'automation'])
    expect(closed.hasLfoInstance).toBe(false)
    expect(closed.isLfoConnected).toBe(false)
    expect(closed.lfoActive).toBe(false)
    expect(closed.editorOpen).toBe(false)

    const open = cutoffState(true)
    expect(open.editorOpen).toBe(true)
    expect(open.hasLfoInstance).toBe(false)
    expect(open.isLfoConnected).toBe(false)
  })

  it('treats a zero-depth route as connected but not active DSP', () => {
    const lfos = defaultFxLfos()
    lfos.filter[0] = { ...lfos.filter[0]!, target: 'filterCutoff', depth: 0 }
    const state = cutoffState(false, lfos)
    expect(state.hasLfoInstance).toBe(true)
    expect(state.isLfoConnected).toBe(true)
    expect(state.lfoActive).toBe(false)
    expect(state.range).toBeNull()
  })

  it('formats the touch affordance without treating the editor as a route', () => {
    expect(formatModulationDepth(18.2)).toBe('±18%')
    const idle = modulationAffordanceModel(cutoffState(true))
    expect(idle.depthLabel).toBeNull()
    expect(idle.automationMark).toBe(false)

    const lfos = defaultFxLfos()
    lfos.filter[0] = { ...lfos.filter[0]!, target: 'filterCutoff', depth: 18, rateHz: 2, shape: 'sine' }
    const automation = ensureAutomationLane(defaultAutomation(), 'filterCutoff', 0.42, 3)
    const both = modulationAffordanceModel(cutoffState(false, lfos, automation))
    expect(both.depthLabel).toBe('±18%')
    expect(both.automationMark).toBe(true)
  })

  it('maps EQ fields onto the shared bank and leaves later bands alone', () => {
    expect(eqModulationParamId(0, 'freq')).toBe('eq1Freq')
    expect(eqModulationParamId(0, 'gain')).toBe('eq1Gain')
    expect(eqModulationParamId(0, 'q')).toBe('eq1Q')
    expect(eqModulationParamId(7, 'freq')).toBe('eq8Freq')
    expect(eqModulationParamId(8, 'freq')).toBeNull()
    expect(eqModulationParamId(8, 'gain')).toBeNull()
    expect(eqModulationParamId(8, 'q')).toBeNull()
  })

  it('keeps the slider thumb on the stored center and the live mark separate', () => {
    const marks = sliderModulationMarks({
      center: 0.4,
      range: { min: 0.22, max: 0.58 },
      live: 0.51,
    })
    expect(marks.thumb).toBe(0.4)
    expect(marks.range).toEqual({ left: 22, width: 36 })
    expect(marks.live).toBe(0.51)
    expect(sliderModulationMarks({ center: 0.4, range: null, live: 0.9 }).live).toBeNull()
  })

  it('reports LFO and automation together without mixing their ranges', () => {
    const lfos = defaultFxLfos()
    lfos.filter[0] = { ...lfos.filter[0]!, target: 'filterCutoff', depth: 18, rateHz: 2, shape: 'square' }
    const automation = ensureAutomationLane(defaultAutomation(), 'filterCutoff', 0.42, 3)
    const state = cutoffState(false, lfos, automation)
    expect(state.lfoActive).toBe(true)
    expect(state.automationActive).toBe(true)
    expect(state.range).not.toBeNull()
    expect(state.depthPct).toBe(18)
    expect(automation.lanes.find((lane) => lane.paramId === 'filterCutoff')?.nodes.length).toBeGreaterThan(0)
  })

  it('offers focus modulation only on fields the shared bank can move', () => {
    expect(eqFocusModulationParam(0, 'freq', 'peaking', true)).toBe('eq1Freq')
    expect(eqFocusModulationParam(0, 'gain', 'peaking', true)).toBe('eq1Gain')
    expect(eqFocusModulationParam(0, 'q', 'highpass', true)).toBe('eq1Q')
    expect(eqFocusModulationParam(0, 'gain', 'highpass', true)).toBeNull()
    expect(eqFocusModulationParam(0, 'freq', 'peaking', false)).toBeNull()
    expect(eqFocusModulationParam(8, 'freq', 'peaking', true)).toBeNull()
  })

  it('draws frequency, gain, and both as separate selected-node ranges', () => {
    expect(
      eqFocusModulationFrame({ x: 40, y: 50, freqX: [20, 60], gainY: null }),
    ).toEqual({ kind: 'horizontal', left: 20, width: 40, centerY: 50 })
    expect(
      eqFocusModulationFrame({ x: 40, y: 50, freqX: null, gainY: [70, 30] }),
    ).toEqual({ kind: 'vertical', centerX: 40, top: 30, height: 40 })
    expect(
      eqFocusModulationFrame({ x: 40, y: 50, freqX: [20, 60], gainY: [30, 70] }),
    ).toEqual({ kind: 'area', left: 20, width: 40, top: 30, height: 40 })
    expect(eqFocusModulationFrame({ x: 40, y: 50, freqX: [20, 20], gainY: null })).toEqual({ kind: 'none' })
  })

  it('mentions an LFO in automation focus only when that lane is also automated', () => {
    const lfos = defaultFxLfos()
    lfos.filter[0] = { ...lfos.filter[0]!, target: 'filterCutoff', depth: 18, rateHz: 2, shape: 'sine' }
    const connected = cutoffState(false, lfos)
    expect(automationFocusLfoCue(connected)).toEqual({ visible: false, depthLabel: null })
    const automation = ensureAutomationLane(defaultAutomation(), 'filterCutoff', 0.42, 3)
    const both = cutoffState(false, lfos, automation)
    expect(automationFocusLfoCue(both)).toEqual({ visible: true, depthLabel: '±18%' })
    expect(automationFocusLfoCue(cutoffState(true, lfos, automation))).toEqual({
      visible: true,
      depthLabel: '±18%',
    })
  })

  it('gives an EQ frequency a horizontal span and leaves gain alone', () => {
    const lfos = defaultFxLfos()
    lfos.eq1[0] = { ...lfos.eq1[0]!, target: 'eq1Freq', depth: 25, shape: 'sine' }
    const guides = eqModulationGuides(lfos, 0, { frequency: 1000, gain: 3 })
    expect(guides.frequency).not.toBeNull()
    expect(guides.frequency!.minHz).toBeLessThan(1000)
    expect(guides.frequency!.maxHz).toBeGreaterThan(1000)
    expect(guides.gain).toBeNull()
  })
})

describe('parameter modulation actions', () => {
  it('adds one cutoff LFO, keeps it across editor disclosure, then removes only that route', () => {
    stubLfoClock()
    const engine = new AudioEngine()
    const proto = Object.getPrototypeOf(engine) as { rebuildGraph: () => Promise<void> }
    const original = proto.rebuildGraph
    let rebuilds = 0
    proto.rebuildGraph = function (this: typeof engine) {
      rebuilds += 1
      return original.call(this)
    }
    try {
      const cutoff = engine.getSnapshot().params.filterCutoff
      expect(connectParameterLfo(engine, 'filterCutoff')).toBe(true)
      expect(connectParameterLfo(engine, 'filterCutoff')).toBe(true)
      const routed = engine.getSnapshot().fxLfos.filter.filter((slot) => slot.target === 'filterCutoff')
      expect(routed).toHaveLength(1)
      expect(engine.getSnapshot().lfoShown.filter).toBe(1)
      setParameterLfoPrimary(engine, 'filterCutoff', { rateHz: 1.5, depth: 18, shape: 'triangle' })
      const slot = engine.getSnapshot().fxLfos.filter[0]!
      expect(slot.rateHz).toBe(1.5)
      expect(slot.depth).toBe(18)
      expect(slot.shape).toBe('triangle')
      expect(slot.depth).not.toBe(LFO_DEPTH_DEFAULT)

      const before = JSON.stringify({
        lfos: engine.getSnapshot().fxLfos,
        cutoff: engine.getSnapshot().params.filterCutoff,
        lanes: engine.getSnapshot().automation.lanes,
      })
      setModulationEditorOpen('filterCutoff', true)
      expect(readModulationEditor('filterCutoff')).toBe(true)
      setModulationEditorOpen('filterCutoff', false)
      expect(readModulationEditor('filterCutoff')).toBe(false)
      setModulationEditorOpen('filterCutoff', true)
      expect(JSON.stringify({
        lfos: engine.getSnapshot().fxLfos,
        cutoff: engine.getSnapshot().params.filterCutoff,
        lanes: engine.getSnapshot().automation.lanes,
      })).toBe(before)
      expect(engine.getSnapshot().fxLfos.filter[0]!.shape).toBe('triangle')

      const automation = ensureAutomationLane(engine.getSnapshot().automation, 'filterCutoff', 0.3, 2)
      removeParameterLfo(engine, 'filterCutoff')
      expect(engine.getSnapshot().fxLfos.filter[0]!.target).toBeNull()
      expect(engine.getSnapshot().params.filterCutoff).toBe(cutoff)
      expect(automation.lanes.find((lane) => lane.paramId === 'filterCutoff')?.nodes.length).toBe(2)
      expect(engine.getSnapshot().fxLfos.eq1[0]!.target).toBeNull()
      expect(rebuilds).toBe(0)
    } finally {
      proto.rebuildGraph = original
    }
  })

  it('modulates EQ frequency on the shared band bank without a second oscillator', () => {
    stubLfoClock()
    const engine = new AudioEngine()
    expect(connectParameterLfo(engine, 'eq1Freq')).toBe(true)
    expect(connectParameterLfo(engine, 'eq1Freq')).toBe(true)
    const hits = engine.getSnapshot().fxLfos.eq1.filter((slot) => slot.target === 'eq1Freq')
    expect(hits).toHaveLength(1)
    const guides = eqModulationGuides(engine.getSnapshot().fxLfos, 0, { frequency: 1000, gain: 0 })
    expect(guides.frequency).not.toBeNull()
    removeParameterLfo(engine, 'eq1Freq')
    expect(engine.getSnapshot().fxLfos.eq1.every((slot) => slot.target !== 'eq1Freq')).toBe(true)
  })

  it('arms one flat automation lane before a sample exists and keeps the LFO route', () => {
    stubLfoClock()
    const engine = new AudioEngine()
    expect(engine.getBuffer()).toBeNull()
    connectParameterLfo(engine, 'filterCutoff')
    setParameterLfoPrimary(engine, 'filterCutoff', { depth: 18, shape: 'square' })
    const before = engine.getSnapshot().fxLfos.filter[0]
    engine.armAutomation('filterCutoff')
    engine.armAutomation('filterCutoff')
    const lane = engine.getSnapshot().automation.lanes.find((item) => item.paramId === 'filterCutoff')
    expect(lane?.nodes).toHaveLength(2)
    expect(engine.getSnapshot().automation.lanes.filter((item) => item.paramId === 'filterCutoff')).toHaveLength(1)
    expect(engine.getSnapshot().fxLfos.filter[0]).toEqual(before)
    const state = parameterModulationState({
      lfos: engine.getSnapshot().fxLfos,
      automation: engine.getSnapshot().automation,
      paramId: 'filterCutoff',
      baseNormalized: toNormalized(engine.getSnapshot().params.filterCutoff, PARAMS.filterCutoff),
      editorOpen: false,
    })
    expect(state.lfoActive).toBe(true)
    expect(state.automationActive).toBe(true)
    expect(modulationAffordanceModel(state)).toEqual({ depthLabel: '±18%', automationMark: true })
  })

  it('leaves an unrelated LFO and the stored value when modulation is removed', () => {
    stubLfoClock()
    const engine = new AudioEngine()
    engine.setFxLfo('filter', 1, { target: 'filterReso', depth: 12, rateHz: 0.4, shape: 'saw' })
    connectParameterLfo(engine, 'filterCutoff')
    const cutoff = engine.getSnapshot().params.filterCutoff
    removeParameterLfo(engine, 'filterCutoff')
    expect(engine.getSnapshot().params.filterCutoff).toBe(cutoff)
    expect(engine.getSnapshot().fxLfos.filter[1]!.target).toBe('filterReso')
    expect(engine.getSnapshot().fxLfos.filter[1]!.depth).toBe(12)
    expect(engine.getSnapshot().automation.lanes).toEqual([])
  })
})
