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
import { eqBandHasLfo } from '../fx/lfo'

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
