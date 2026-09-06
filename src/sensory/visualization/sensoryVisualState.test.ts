import { describe, expect, it } from 'vitest'
import { defaultSensoryValues, patchSensoryValue } from '../sensoryState'
import { DUSK_RIDGE, landscapeStops, lensInk, lerpVisualState, panNorm, ridgeInk, sensoryVisualState, spaceZoom } from './sensoryVisualState'

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

  it('opens haze and depth from space, and grows the wave', () => {
    const rest = sensoryVisualState(defaultSensoryValues(), true)
    const vast = sensoryVisualState(patchSensoryValue(defaultSensoryValues(), 'space', 0.9), true)
    expect(vast.haze).toBeGreaterThan(rest.haze)
    expect(vast.depth).toBeGreaterThan(rest.depth)
    expect(spaceZoom(0.9)).toBeGreaterThan(spaceZoom(0))
    expect(vast.zoom).toBeGreaterThan(rest.zoom)
    expect(vast.mass).toBeGreaterThan(rest.mass)
  })

  it('tints toward the focused axis', () => {
    const values = patchSensoryValue(defaultSensoryValues(), 'dirt', 0.8)
    const idle = sensoryVisualState(values, true, null)
    const focused = sensoryVisualState(values, true, 'dirt')
    expect(focused.ink.r).toBeGreaterThan(idle.ink.r - 1)
    expect(focused.activeAxis).toBe('dirt')
  })

  it('dissolves several axis tints like watercolors', () => {
    const mixed = sensoryVisualState(
      {
        ...defaultSensoryValues(),
        space: 0.7,
        dirt: 0.6,
        grain: 0.5,
      },
      true,
    )
    const spaceOnly = sensoryVisualState(patchSensoryValue(defaultSensoryValues(), 'space', 0.7), true)
    expect(mixed.ink.r).toBeGreaterThan(spaceOnly.ink.r)
    expect(mixed.ink.g).not.toBeCloseTo(spaceOnly.ink.g, 0)
  })
})

describe('ridgeInk', () => {
  it('keeps dusk mountains warmer on the left and cooler on the right', () => {
    const wash = ridgeInk({ r: 180, g: 160, b: 140 }, DUSK_RIDGE)
    expect(wash.left.r).toBeGreaterThan(wash.right.r)
    expect(wash.right.b).toBeGreaterThan(wash.left.b)
    expect(wash.mid.g).toBeGreaterThan(wash.left.g)
  })
})

describe('panNorm', () => {
  it('maps engine pan percent onto -1..1', () => {
    expect(panNorm(0)).toBe(0)
    expect(panNorm(100)).toBe(1)
    expect(panNorm(-50)).toBeCloseTo(-0.5)
  })
})

describe('landscapeStops', () => {
  it('warms the left and cools the right as character and space open', () => {
    const rest = landscapeStops(sensoryVisualState(defaultSensoryValues(), true))
    const mood = landscapeStops(
      sensoryVisualState(
        {
          ...defaultSensoryValues(),
          character: 0.85,
          space: 0.8,
          drift: 0.5,
        },
        true,
      ),
    )
    expect(mood.left.r).toBeGreaterThan(rest.left.r - 1)
    expect(mood.right.b).toBeGreaterThan(mood.left.b - 8)
  })
})

describe('lerpVisualState', () => {
  it('eases warmth toward the target', () => {
    const from = sensoryVisualState(defaultSensoryValues(), true)
    const to = sensoryVisualState(patchSensoryValue(defaultSensoryValues(), 'character', 1), true)
    const mid = lerpVisualState(from, to, 0.5)
    expect(mid.warmth).toBeGreaterThan(from.warmth)
    expect(mid.warmth).toBeLessThan(to.warmth)
  })
})
