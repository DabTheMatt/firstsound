import { describe, expect, it } from 'vitest'
import { canyonProject, canyonRelief, canyonSliceCount, canyonWallInset, canyonWallX, chromaticShift, gleamRayCount, mirrorLayout, rangeLayout } from './rangeScenes'
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

  it('pins mirror ridges to the top and bottom edges with inward peaks', () => {
    const layout = mirrorLayout(1000)
    expect(layout.upperBase).toBeLessThan(40)
    expect(layout.lowerBase).toBeGreaterThan(960)
    expect(layout.upperDir).toBe(1)
    expect(layout.lowerDir).toBe(-1)
    const upperTip = layout.upperBase + layout.amp * layout.upperDir
    const lowerTip = layout.lowerBase + layout.amp * layout.lowerDir
    expect(upperTip).toBeGreaterThan(layout.upperBase)
    expect(lowerTip).toBeLessThan(layout.lowerBase)
    expect(lowerTip).toBeGreaterThan(upperTip)
  })

  it('fills the range frame from the bottom edge to the top', () => {
    const layout = rangeLayout(1000)
    expect(layout.base).toBeGreaterThan(970)
    expect(layout.amp).toBeGreaterThan(900)
    expect(layout.base - layout.amp).toBeLessThan(80)
    expect(layout.dir).toBe(-1)
  })

  it('projects canyon slices from a full-width near plane to a vanishing point', () => {
    const near = canyonProject(0, 0, 0, 1000, 800)
    const far = canyonProject(0, 1, 0, 1000, 800)
    const peak = canyonProject(0.5, 0, 1, 1000, 800)
    expect(near.x).toBeLessThan(20)
    expect(far.x).toBeGreaterThan(400)
    expect(near.floorY).toBeGreaterThan(far.floorY)
    expect(near.scale).toBeGreaterThan(far.scale)
    expect(peak.y).toBeLessThan(120)
    expect(canyonSliceCount(800)).toBeGreaterThan(16)
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
