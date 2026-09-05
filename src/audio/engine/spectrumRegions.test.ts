import { describe, expect, it } from 'vitest'
import { bandCenterHz, eqBandPaletteColor, regionForHz, SPECTRUM_REGIONS } from './spectrumRegions'
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

  it('assigns a distinct palette color to each EQ band', () => {
    const colors = [0, 1, 2, 3].map(eqBandPaletteColor)
    expect(new Set(colors).size).toBe(4)
    expect(eqBandPaletteColor(0)).toBe(SPECTRUM_REGIONS[0]!.color)
    expect(eqBandPaletteColor(1)).toBe(SPECTRUM_REGIONS[2]!.color)
    expect(eqBandPaletteColor(3)).toBe(SPECTRUM_REGIONS[6]!.color)
  })
})
