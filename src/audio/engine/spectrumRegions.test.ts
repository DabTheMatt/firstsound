import { describe, expect, it } from 'vitest'
import { bandCenterHz, regionForHz } from './spectrumRegions'
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
  })

  it('uses geometric band centers', () => {
    const edges = logBandEdgesHz(20, 20000, 8)
    const c = bandCenterHz(edges, 0)
    expect(c).toBeGreaterThan(edges[0]!)
    expect(c).toBeLessThan(edges[1]!)
  })
})
