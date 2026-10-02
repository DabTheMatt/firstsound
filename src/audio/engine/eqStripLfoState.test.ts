import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import {
  CREATED_EQ_STRIP_TYPES,
  defaultEqBandAt,
  eqStripKey,
  initializeCreatedEqBand,
  type EqBand,
  type EqFilterType,
} from './eqBands'
import { eqBandHasLfo, LFO_DEPTH_DEFAULT, LFO_RATE_DEFAULT } from '../fx/lfo'

function idsOf(engine: AudioEngine, instanceId: string): string[] {
  return engine.getSnapshot().eqById[instanceId]!.bands.map((band) => band.id ?? '')
}

describe('initializeCreatedEqBand', () => {
  it('collapses every new filter type and mints a new id when nothing is connected', () => {
    for (const type of CREATED_EQ_STRIP_TYPES) {
      const band = defaultEqBandAt(0)
      band.lfoExpanded = true
      let n = 0
      const next = initializeCreatedEqBand(band, { type }, false, () => `fresh-${type}-${++n}`)
      expect(next.id).not.toBe(band.id)
      expect(next.lfoExpanded).toBe(false)
      expect(next.type).toBe(type)
    }
  })

  it('keeps id and expansion when the same slot already has a connected LFO', () => {
    const band = { ...defaultEqBandAt(0), id: 'kept', lfoExpanded: true, type: 'off' as const }
    const next = initializeCreatedEqBand(band, { type: 'peaking' }, true, () => 'other')
    expect(next.id).toBe('kept')
    expect(next.lfoExpanded).toBe(true)
    expect(next.type).toBe('peaking')
  })

  it('keeps identity when an existing strip only changes type', () => {
    const band = { ...defaultEqBandAt(1), id: 'bell', type: 'peaking' as const, lfoExpanded: true }
    const next = initializeCreatedEqBand(band, { type: 'notch' }, false, () => 'other')
    expect(next.id).toBe('bell')
    expect(next.lfoExpanded).toBe(true)
    expect(next.type).toBe('notch')
  })
})

describe('eqStripKey', () => {
  it('follows the band id and ignores array position', () => {
    const band = { id: 'band-a' }
    expect(eqStripKey('eq-1', band)).toBe('eq-1:band-a')
    expect(eqStripKey('eq-1', band)).toBe(eqStripKey('eq-2', { id: 'band-a' }).replace('eq-2', 'eq-1'))
    const moved = eqStripKey('eq-1', band)
    expect(moved).not.toContain('0')
    expect(eqStripKey('eq-1', { id: 'band-b' })).not.toBe(moved)
  })
})

describe('new EQ strips', () => {
  const order: EqFilterType[] = [
    'peaking',
    'notch',
    'highpass',
    'lowpass',
    'lowshelf',
    'highshelf',
    'bandpass',
    'peaking',
    'notch',
    'highpass',
    'lowshelf',
    'highshelf',
  ]

  it('starts every new unconnected strip collapsed, across adds and removals', () => {
    const engine = new AudioEngine()
    const instanceId = engine.ensureModule('eq')
    expect(instanceId).toBeTruthy()
    const id = instanceId!
    const seen = new Set<string>()

    const create = (type: EqFilterType) => {
      const bands = engine.getSnapshot().eqById[id]!.bands
      let index = bands.findIndex((band) => band.type === 'off')
      if (index < 0) {
        const added = engine.addEqBand(id)
        expect(added).not.toBeNull()
        index = added!
      }
      const before = bands[index] ?? engine.getSnapshot().eqById[id]!.bands[index]!
      const slope = type === 'highpass' || type === 'lowpass' ? 48 : undefined
      engine.setEqBand(index, slope ? { type, slope } : { type }, id)
      const created = engine.getSnapshot().eqById[id]!.bands[index]!
      expect(created.type).toBe(type)
      expect(created.lfoExpanded).toBe(false)
      expect(created.id).toBeTruthy()
      expect(seen.has(created.id!)).toBe(false)
      if (before?.type === 'off' && !eqBandHasLfo(engine.getSnapshot().fxLfos, index)) {
        expect(created.id).not.toBe(before.id)
      }
      seen.add(created.id!)
      return created
    }

    const first = create('peaking')
    engine.setEqBand(0, { lfoExpanded: true }, id)
    engine.setFxLfo('eq1', 0, { target: 'eq1Freq', depth: 0 })
    expect(engine.getSnapshot().eqById[id]!.bands[0]!.lfoExpanded).toBe(true)
    expect(engine.getSnapshot().fxLfos.eq1[0]!.target).toBe('eq1Freq')

    const created: EqBand[] = [engine.getSnapshot().eqById[id]!.bands[0]!]
    for (const type of order.slice(1)) {
      if (created.length === 3) {
        engine.setEqBand(2, { type: 'off' }, id)
      }
      created.push(create(type))
    }

    expect(created.length).toBeGreaterThanOrEqual(10)
    const bands = engine.getSnapshot().eqById[id]!.bands
    const active = bands.filter((band) => band.type !== 'off')
    for (const band of active) {
      if (band.id === first.id) continue
      expect(band.lfoExpanded).toBe(false)
    }
    expect(bands[0]!.id).toBe(first.id)
    expect(bands[0]!.lfoExpanded).toBe(true)
    expect(engine.getSnapshot().fxLfos.eq1[0]!.target).toBe('eq1Freq')
    expect(eqBandHasLfo(engine.getSnapshot().fxLfos, 0)).toBe(true)

    const keys = idsOf(engine, id).filter(Boolean)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('forgets every LFO and automation setting when the band is removed', () => {
    const engine = new AudioEngine()
    const id = engine.ensureModule('eq')!
    engine.createEqStrip('peaking', id)
    engine.createEqStrip('notch', id)
    engine.setEqBand(0, { lfoExpanded: true }, id)
    engine.addFxLfo('eq1')
    engine.setFxLfo('eq1', 0, {
      target: 'eq1Freq',
      depth: 80,
      rateHz: 2.5,
      shape: 'square',
      enabled: false,
    })
    engine.setFxLfo('eq1', 1, {
      target: 'eq1Gain',
      depth: 12,
      rateHz: 0.2,
      shape: 'saw',
      enabled: false,
    })
    engine.setFxLfo('eq2', 0, {
      target: 'eq2Freq',
      depth: 50,
      rateHz: 1.2,
      shape: 'triangle',
      enabled: false,
    })
    engine.armAutomation('eq1Q')
    expect(engine.getSnapshot().automation.lanes.some((lane) => lane.paramId === 'eq1Q')).toBe(true)

    engine.setEqBand(0, { type: 'off' }, id)

    const removed = engine.getSnapshot().fxLfos.eq1
    expect(removed.every((lfo) => lfo.target == null)).toBe(true)
    expect(removed.every((lfo) => lfo.depth === LFO_DEPTH_DEFAULT)).toBe(true)
    expect(removed.every((lfo) => lfo.rateHz === LFO_RATE_DEFAULT)).toBe(true)
    expect(removed.every((lfo) => lfo.shape === 'sine')).toBe(true)
    expect(removed.every((lfo) => lfo.enabled !== false)).toBe(true)
    expect(engine.getSnapshot().lfoShown.eq1).toBe(1)
    expect(engine.getSnapshot().automation.lanes.some((lane) => lane.paramId === 'eq1Q')).toBe(false)
    expect(engine.getSnapshot().fxLfos.eq2[0]!.target).toBe('eq2Freq')
    expect(engine.getSnapshot().fxLfos.eq2[0]!.depth).toBe(50)
    expect(engine.getSnapshot().fxLfos.eq2[0]!.enabled).toBe(false)
  })

  it('gives a reused slot a blank LFO after the last band is removed', () => {
    const engine = new AudioEngine()
    const id = engine.ensureModule('eq')!
    engine.createEqStrip('peaking', id)
    engine.setEqBand(0, { lfoExpanded: true }, id)
    engine.setFxLfo('eq1', 0, {
      target: 'eq1Freq',
      depth: 80,
      rateHz: 2.5,
      shape: 'square',
      enabled: false,
    })
    engine.armAutomation('eq1Gain')
    engine.setEqBand(0, { type: 'off' }, id)

    const created = engine.createEqStrip('peaking', id)
    expect(created).toBe(0)
    const band = engine.getSnapshot().eqById[id]!.bands[0]!
    expect(band.type).toBe('peaking')
    expect(band.lfoExpanded).toBe(false)
    expect(eqBandHasLfo(engine.getSnapshot().fxLfos, 0)).toBe(false)
    expect(engine.getSnapshot().fxLfos.eq1[0]!.rateHz).toBe(LFO_RATE_DEFAULT)
    expect(engine.getSnapshot().fxLfos.eq1[0]!.depth).toBe(LFO_DEPTH_DEFAULT)
    expect(engine.getSnapshot().fxLfos.eq1[0]!.shape).toBe('sine')
    expect(engine.getSnapshot().automation.lanes.some((lane) => lane.paramId.startsWith('eq1'))).toBe(false)
  })

  it('keeps the LFO when the filter type changes without removing the band', () => {
    const engine = new AudioEngine()
    const id = engine.ensureModule('eq')!
    engine.createEqStrip('peaking', id)
    engine.setFxLfo('eq1', 0, {
      target: 'eq1Freq',
      depth: 40,
      rateHz: 1.5,
      shape: 'triangle',
      enabled: false,
    })
    engine.setEqBand(0, { type: 'notch' }, id)
    const lfo = engine.getSnapshot().fxLfos.eq1[0]!
    expect(lfo.target).toBe('eq1Freq')
    expect(lfo.depth).toBe(40)
    expect(lfo.rateHz).toBe(1.5)
    expect(lfo.shape).toBe('triangle')
  })

  it('does not disconnect an LFO when the section is collapsed', () => {
    const engine = new AudioEngine()
    const id = engine.ensureModule('eq')!
    engine.setEqBand(0, { type: 'peaking' }, id)
    engine.setFxLfo('eq1', 0, { target: 'eq1Freq', depth: 0 })
    engine.setEqBand(0, { lfoExpanded: false }, id)
    const band = engine.getSnapshot().eqById[id]!.bands[0]!
    expect(band.lfoExpanded).toBe(false)
    expect(engine.getSnapshot().fxLfos.eq1[0]!.target).toBe('eq1Freq')
    expect(band.type).toBe('peaking')
  })
})
