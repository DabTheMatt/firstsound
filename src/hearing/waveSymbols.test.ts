import { describe, expect, it } from 'vitest'
import {
  SYMBOL_BAR_BAND,
  SYMBOL_GLYPH_BAND,
  SYMBOL_STRIP_HEIGHT,
  symbolBarRect,
  symbolGlyphBaseline,
  waveSymbolsVisible,
} from './waveSymbols'

describe('wave symbol strip', () => {
  it('keeps level bars inside the lower band', () => {
    for (const level of [0, 0.25, 0.5, 1, -1, 2]) {
      const bar = symbolBarRect(level)
      expect(bar.y).toBeGreaterThanOrEqual(SYMBOL_GLYPH_BAND)
      expect(bar.height).toBeGreaterThan(0)
      expect(bar.height).toBeLessThanOrEqual(SYMBOL_BAR_BAND)
      expect(bar.y + bar.height).toBeLessThanOrEqual(SYMBOL_STRIP_HEIGHT)
    }
  })

  it('places the glyph baseline inside the upper band', () => {
    const baseline = symbolGlyphBaseline()
    expect(baseline).toBeGreaterThan(8)
    expect(baseline).toBeLessThanOrEqual(SYMBOL_GLYPH_BAND)
  })

  it('reserves the lane only while symbols are drawn', () => {
    const layers = { dynamicsMap: true, events: false }
    expect(waveSymbolsVisible({ enabled: true, showWaveSymbols: true, layers })).toBe(true)
    expect(waveSymbolsVisible({ enabled: true, showWaveSymbols: false, layers })).toBe(false)
    expect(waveSymbolsVisible({ enabled: false, showWaveSymbols: true, layers })).toBe(false)
    expect(
      waveSymbolsVisible({
        enabled: true,
        showWaveSymbols: true,
        layers: { dynamicsMap: false, events: false },
      }),
    ).toBe(false)
  })
})
