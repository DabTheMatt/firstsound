import { describe, expect, it } from 'vitest'
import { bandCenterHz, eqBandColorForHz, regionForHz } from './spectrumRegions'
import { logBandEdgesHz } from './spectrumBands'

describe('spectrumRegions', () => {
  it('maps mix ranges to labels', () => {
    expect(regionForHz(40).id).toBe('sub')
    expect(regionForHz(80).id).toBe('lowBass')
    expect(regionForHz(180).id).toBe('midBass')
    expect(regionForHz(320).id).toBe('highBass')
    expect(regionForHz(800).id).toBe('lowMid')
    expect(regionForHz(3000).id).toBe('highMid')
    expect(regionForHz(8000).id).toBe('presence')
    expect(regionForHz(14000).id).toBe('air')
    expect(regionForHz(12).id).toBe('sub')
  })

  it('uses geometric band centers', () => {
    const edges = logBandEdgesHz(20, 20000, 8)
    const c = bandCenterHz(edges, 0)
    expect(c).toBeGreaterThan(edges[0]!)
    expect(c).toBeLessThan(edges[1]!)
  })

  it('uses the spectrum region hue for the same frequency', () => {
    expect(eqBandColorForHz(10)).toBe(regionForHz(10).color)
    expect(eqBandColorForHz(25000)).toBe(regionForHz(25000).color)
    expect(eqBandColorForHz(40)).toBe('#7a5cff')
    expect(eqBandColorForHz(14000)).toBe('#e85a7a')
    expect(eqBandColorForHz(80)).not.toBe(eqBandColorForHz(12000))
  })
})
