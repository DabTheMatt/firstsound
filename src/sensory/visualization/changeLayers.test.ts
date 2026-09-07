import { describe, expect, it } from 'vitest'
import { changeLayerSpecs, editFilmGrainBoost } from './changeLayers'

describe('changeLayerSpecs', () => {
  it('stays empty at rest and grows fading shells as energy rises', () => {
    expect(changeLayerSpecs(0, 0.2)).toEqual([])
    const mild = changeLayerSpecs(0.4, 0.1)
    const full = changeLayerSpecs(1, 0.1)
    expect(full.length).toBeGreaterThan(mild.length)
    expect(full[0]!.scale).toBeGreaterThan(1)
    expect(full.every((layer) => layer.alpha <= 0.25)).toBe(true)
  })

  it('expands and fades as the phase advances', () => {
    const early = changeLayerSpecs(1, 0.05)[0]!
    const late = changeLayerSpecs(1, 0.8)[0]!
    expect(late.scale).toBeGreaterThan(early.scale)
    expect(late.alpha).toBeLessThan(early.alpha)
  })
})

describe('editFilmGrainBoost', () => {
  it('adds more grain when editing grain than when editing space', () => {
    expect(editFilmGrainBoost(null, 1)).toBe(0)
    expect(editFilmGrainBoost('grain', 0.8)).toBeGreaterThan(editFilmGrainBoost('space', 0.8))
  })
})
