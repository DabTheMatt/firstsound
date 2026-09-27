import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { eqCreatedBandIndex, planEqBandInsert, type EqFilterType } from './eqBands'

describe('planEqBandInsert', () => {
  it('does not treat the ADD control as a band', () => {
    const bands = [{ type: 'peaking' }, { type: 'notch' }, { type: 'highpass' }, { type: 'off' }]
    expect(eqCreatedBandIndex(bands)).toBe(3)
    expect(planEqBandInsert(bands)).toEqual({ kind: 'use', index: 3 })
    expect(eqCreatedBandIndex(bands.slice(0, 3))).toBe(3)
    expect(planEqBandInsert(bands.slice(0, 3))).toEqual({ kind: 'append' })
  })

  it('appends after the last active band when an earlier slot is empty', () => {
    const bands = [{ type: 'peaking' }, { type: 'notch' }, { type: 'off' }, { type: 'lowpass' }]
    expect(eqCreatedBandIndex(bands)).toBe(4)
    expect(planEqBandInsert(bands)).toEqual({ kind: 'append' })
  })

  it('uses the first slot when every band is off', () => {
    expect(planEqBandInsert([{ type: 'off' }, { type: 'off' }])).toEqual({ kind: 'use', index: 0 })
  })
})

describe('createEqStrip order', () => {
  const sequence: EqFilterType[] = [
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
  ]

  it('keeps ten new strips in creation order at the end of the sequence', () => {
    const engine = new AudioEngine()
    const id = engine.ensureModule('eq')
    expect(id).toBeTruthy()
    const indexes = sequence.map((type) => engine.createEqStrip(type, id!))
    expect(indexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    const bands = engine.getSnapshot().eqById[id!]!.bands
    const active = bands.filter((band) => band.type !== 'off')
    expect(active.map((band) => band.type)).toEqual(sequence)
    expect(bands.findLastIndex((band) => band.type !== 'off')).toBe(9)
    for (let i = 1; i < indexes.length; i++) {
      expect(indexes[i]!).toBeGreaterThan(indexes[i - 1]!)
    }
  })

  it('places the next strip after the last active band, not in an earlier hole', () => {
    const engine = new AudioEngine()
    const id = engine.ensureModule('eq')!
    engine.createEqStrip('peaking', id)
    engine.createEqStrip('notch', id)
    engine.createEqStrip('highpass', id)
    engine.createEqStrip('lowpass', id)
    engine.setEqBand(2, { type: 'off' }, id)
    const index = engine.createEqStrip('highshelf', id)
    const bands = engine.getSnapshot().eqById[id]!.bands
    const activeIndexes = bands.flatMap((band, i) => (band.type === 'off' ? [] : [i]))
    expect(bands[2]!.type).toBe('off')
    expect(index).toBe(activeIndexes[activeIndexes.length - 1])
    expect(activeIndexes).toEqual([0, 1, 3, index])
    expect(bands[index!]!.type).toBe('highshelf')
  })
})
