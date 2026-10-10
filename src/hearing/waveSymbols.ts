/** Height of the glyph row above the level bars. */
export const SYMBOL_GLYPH_BAND = 14

/** Height of the level-bar row under the glyphs. */
export const SYMBOL_BAR_BAND = 12

/** Reserved lane under the waveform and above the time ruler. */
export const SYMBOL_STRIP_HEIGHT = SYMBOL_GLYPH_BAND + SYMBOL_BAR_BAND

type SymbolSettings = {
  enabled: boolean
  showWaveSymbols: boolean
  layers: { dynamicsMap: boolean; events: boolean }
}

/** True when the strip actually paints, so the waveform can leave it a lane. */
export function waveSymbolsVisible(settings: SymbolSettings): boolean {
  return settings.enabled && settings.showWaveSymbols && (settings.layers.dynamicsMap || settings.layers.events)
}

/** Baseline for glyphs. The ink stays inside the upper band. */
export function symbolGlyphBaseline(): number {
  return 11
}

/**
 * Level bar inside the lower band.
 * `level` is 0..1. The bar never enters the glyph row.
 */
export function symbolBarRect(level: number): { y: number; height: number } {
  const clamped = Math.max(0, Math.min(1, level))
  const inner = SYMBOL_BAR_BAND - 2
  const height = 2 + clamped * (inner - 2)
  const y = SYMBOL_STRIP_HEIGHT - 1 - height
  return { y, height }
}
