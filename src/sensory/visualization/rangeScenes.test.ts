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

  it('grows the range mountain as space opens', () => {
    const rest = rangeLayout(1000, 0)
    const vast = rangeLayout(1000, 1)
    expect(vast.amp).toBeGreaterThan(rest.amp)
    expect(rest.amp).toBeLessThan(550)
    expect(vast.amp).toBeGreaterThan(900)
    expect(rest.dir).toBe(-1)
  })

  it('keeps canyon slices axis-aligned: x follows time, baselines stay parallel', () => {
    const near = canyonProject(0, 0, 0, 1000, 800)
    const far = canyonProject(0, 1, 0, 1000, 800)
    const midNear = canyonProject(0.5, 0, 0, 1000, 800)
    const midFar = canyonProject(0.5, 1, 0, 1000, 800)
    expect(near.x).toBeCloseTo(0)
    expect(far.x).toBeCloseTo(0)
    expect(midNear.x).toBeCloseTo(500)
    expect(midFar.x).toBeCloseTo(500)
    expect(near.floorY).toBeGreaterThan(far.floorY)
    expect(near.scale).toBe(1)
    expect(far.scale).toBe(1)
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
