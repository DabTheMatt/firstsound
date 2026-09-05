import { describe, expect, it } from 'vitest'
import { canyonWallInset, chromaticShift, gleamRayCount } from './rangeScenes'
import { grainBandCount } from './mountainLayers'

describe('rangeScenes', () => {
  it('narrows the canyon toward the vanishing point', () => {
    expect(canyonWallInset(1, 1000)).toBeGreaterThan(canyonWallInset(0, 1000))
  })

  it('splits drift into opposing RGB offsets', () => {
    const c = chromaticShift(1, 1)
    expect(c.r).toBeLessThan(0)
    expect(c.b).toBeGreaterThan(0)
    expect(Math.abs(c.r)).toBeGreaterThan(40)
  })

  it('adds more gleam rays as energy rises', () => {
    expect(gleamRayCount(1)).toBeGreaterThan(gleamRayCount(0))
  })
})

describe('grain strips', () => {
  it('opens many visible bands at full grain', () => {
    expect(grainBandCount(1)).toBeGreaterThanOrEqual(12)
  })
})
