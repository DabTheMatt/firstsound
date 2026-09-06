import { describe, expect, it } from 'vitest'
import { absEnvelope, blurEnvelope, contourCount, echoGhostSpecs, grainBandCount, grainDustCount, mountainLayerSpecs, normalizeEnvelopePeak } from './mountainLayers'

describe('mountainLayerSpecs', () => {
  it('adds a far ridge when there is motion', () => {
    expect(mountainLayerSpecs(0.4, 0).length).toBe(4)
    expect(mountainLayerSpecs(0.4, 0.5).length).toBe(5)
  })

  it('adds distant ridges as space opens', () => {
    expect(mountainLayerSpecs(0.4, 0, 0.3).length).toBe(5)
    expect(mountainLayerSpecs(0.4, 0, 0.7).length).toBe(6)
  })

  it('recedes later ridges on z', () => {
    const layers = mountainLayerSpecs(0.4, 0.5, 0.4)
    expect(layers[0]?.z).toBe(0)
    expect(layers[layers.length - 1]!.z).toBeGreaterThan(layers[0]!.z)
  })
})

describe('grainBandCount', () => {
  it('stays solid at rest and splits as grain rises', () => {
    expect(grainBandCount(0)).toBe(1)
    expect(grainBandCount(0.3)).toBeGreaterThan(2)
    expect(grainBandCount(1)).toBeGreaterThan(grainBandCount(0.3))
  })
})

describe('grainDustCount', () => {
  it('stays empty at rest and adds sparse stardust as grain rises', () => {
    expect(grainDustCount(0, 1200)).toBe(0)
    expect(grainDustCount(0.25, 1200)).toBeGreaterThan(20)
    expect(grainDustCount(1, 1200)).toBeGreaterThan(grainDustCount(0.4, 1200))
    expect(grainDustCount(1, 1200)).toBeLessThan(250)
  })
})

describe('contourCount', () => {
  it('adds flowing isolines as space opens', () => {
    expect(contourCount(1)).toBeGreaterThan(contourCount(0))
  })
})

describe('echoGhostSpecs', () => {
  it('adds faint delayed copies as echo rises', () => {
    expect(echoGhostSpecs(0)).toEqual([])
    const mild = echoGhostSpecs(0.3)
    const full = echoGhostSpecs(1)
    expect(full.length).toBeGreaterThan(mild.length)
    expect(full[full.length - 1]!.xOff).toBeGreaterThan(full[0]!.xOff)
    expect(full[full.length - 1]!.xOff).toBeLessThan(0.08)
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
