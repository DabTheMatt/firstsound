import { describe, expect, it } from 'vitest'
import { canyonRelief, canyonWallInset, canyonWallX, chromaticShift, gleamRayCount, mirrorLayout } from './rangeScenes'
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

  it('leaves an open band between the two mirror ridges', () => {
    const layout = mirrorLayout(1000)
    expect(layout.lowerBase - layout.upperBase).toBeCloseTo(layout.gap)
    expect(layout.gap).toBeGreaterThan(200)
    expect(layout.upperBase).toBeLessThan(500)
    expect(layout.lowerBase).toBeGreaterThan(500)
  })

  it('puts canyon relief on the walls, nearer samples larger', () => {
    const nearL = canyonWallX('left', 0, 1000, canyonRelief(1, 0, 1000))
    const farL = canyonWallX('left', 1, 1000, canyonRelief(1, 1, 1000))
    const nearR = canyonWallX('right', 0, 1000, 0)
    const farR = canyonWallX('right', 1, 1000, 0)
    expect(nearL).toBeLessThan(farL)
    expect(nearR - canyonWallX('left', 0, 1000, 0)).toBeGreaterThan(farR - farL)
    expect(canyonRelief(1, 0, 1000)).toBeGreaterThan(canyonRelief(1, 1, 1000))
  })
})

describe('grain strips', () => {
  it('opens many visible bands at full grain', () => {
    expect(grainBandCount(1)).toBeGreaterThanOrEqual(12)
  })
})
