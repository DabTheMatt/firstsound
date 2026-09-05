import { describe, expect, it } from 'vitest'
import { absEnvelope, blurEnvelope, grainBandCount, mountainLayerSpecs, normalizeEnvelopePeak } from './mountainLayers'

describe('mountainLayerSpecs', () => {
  it('adds a far ridge when there is motion', () => {
    expect(mountainLayerSpecs(0.4, 0).length).toBe(4)
    expect(mountainLayerSpecs(0.4, 0.5).length).toBe(5)
  })

  it('adds distant ridges as space opens', () => {
    expect(mountainLayerSpecs(0.4, 0, 0.3).length).toBe(5)
    expect(mountainLayerSpecs(0.4, 0, 0.7).length).toBe(6)
  })
})

describe('grainBandCount', () => {
  it('stays solid at rest and splits as grain rises', () => {
    expect(grainBandCount(0)).toBe(1)
    expect(grainBandCount(0.3)).toBeGreaterThan(2)
    expect(grainBandCount(1)).toBeGreaterThan(grainBandCount(0.3))
  })
})

describe('blurEnvelope', () => {
  it('keeps a spike but spreads it', () => {
    const src = new Float32Array([0, 0, 1, 0, 0])
    const out = blurEnvelope(src, 1)
    expect(out[2]).toBeLessThan(1)
    expect(out[1]).toBeGreaterThan(0)
  })
})

describe('absEnvelope', () => {
  it('takes the larger absolute peak', () => {
    const min = new Float32Array([0, -0.8])
    const max = new Float32Array([0.2, 0.1])
    expect(absEnvelope(min, max)[1]).toBeCloseTo(0.8)
  })
})

describe('normalizeEnvelopePeak', () => {
  it('scales the loudest bin to 1', () => {
    const src = new Float32Array([0.1, 0.2, 0.05])
    const out = normalizeEnvelopePeak(src)
    expect(out[1]).toBeCloseTo(1)
    expect(out[0]).toBeCloseTo(0.5)
  })
})
