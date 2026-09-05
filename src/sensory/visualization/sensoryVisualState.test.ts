import { describe, expect, it } from 'vitest'
import { defaultSensoryValues, patchSensoryValue } from '../sensoryState'
import { lensInk, sensoryVisualState, spaceZoom } from './sensoryVisualState'

describe('lensInk', () => {
  it('runs warmer as warmth rises', () => {
    const cold = lensInk(0.1, 0.5)
    const hot = lensInk(0.9, 0.5)
    expect(hot.r).toBeGreaterThan(cold.r)
    expect(hot.b).toBeLessThan(cold.b)
  })

  it('runs brighter as glow rises', () => {
    const dim = lensInk(0.5, 0.15)
    const bright = lensInk(0.5, 0.9)
    expect(bright.r + bright.g + bright.b).toBeGreaterThan(dim.r + dim.g + dim.b)
  })
})

describe('sensoryVisualState', () => {
  it('carries echo into the visual state', () => {
    const visual = sensoryVisualState(patchSensoryValue(defaultSensoryValues(), 'echo', 0.8), true)
    expect(visual.echo).toBeCloseTo(0.8)
  })

  it('opens haze and depth from space, and zooms the wave away', () => {
    const rest = sensoryVisualState(defaultSensoryValues(), true)
    const vast = sensoryVisualState(patchSensoryValue(defaultSensoryValues(), 'space', 0.9), true)
    expect(vast.haze).toBeGreaterThan(rest.haze)
    expect(vast.depth).toBeGreaterThan(rest.depth)
    expect(spaceZoom(0)).toBeGreaterThan(spaceZoom(0.9))
    expect(vast.zoom).toBeLessThan(rest.zoom)
  })

  it('tints toward the focused axis', () => {
    const values = patchSensoryValue(defaultSensoryValues(), 'dirt', 0.8)
    const idle = sensoryVisualState(values, true, null)
    const focused = sensoryVisualState(values, true, 'dirt')
    expect(focused.ink.r).toBeGreaterThan(idle.ink.r - 1)
    expect(focused.activeAxis).toBe('dirt')
  })
})
