/** CSS pixels reserved around the FFT plot. Top fits note labels; bottom is the Hz band. */
export const SPECTRUM_PLOT_PAD = { left: 44, right: 12, top: 18, bottom: 40 }

/**
 * Phone plot inset. Scale text is drawn inside the graph, so the canvas
 * keeps only a few pixels of air for touch and anti-aliased strokes.
 */
export const SPECTRUM_PLOT_PAD_COMPACT = { left: 4, right: 4, top: 6, bottom: 4 }

/** Fewer frequency labels than the desktop grid, chosen from the available width. */
export function phoneFrequencyTicks(widthPx: number): readonly number[] {
  if (widthPx < 340) return [100, 1000, 10000]
  if (widthPx < 430) return [20, 100, 1000, 10000, 20000]
  return [20, 100, 1000, 5000, 10000, 20000]
}

/** Sparse dB labels that can sit inside a short phone spectrum. */
export function compactDbMarks(minDb: number): number[] {
  const floor = Math.round(minDb)
  const wanted = [0, -12, -24, floor]
  return [...new Set(wanted.filter((db) => db <= 0 && db >= floor))].sort((a, b) => b - a)
}

/** Distance from the plot bottom to the top of the Hz labels, in CSS pixels. */
export const SPECTRUM_HZ_LABEL_OFFSET = 14

export type SpectrumPlotBox = {
  left: number
  top: number
  right: number
  bottom: number
  labelTop: number
  labelBottom: number
}

/** Plot rectangle plus the X-axis label band beneath it. */
export function spectrumPlotBox(cssWidth: number, cssHeight: number): SpectrumPlotBox {
  const left = SPECTRUM_PLOT_PAD.left
  const top = SPECTRUM_PLOT_PAD.top
  const right = cssWidth - SPECTRUM_PLOT_PAD.right
  const bottom = cssHeight - SPECTRUM_PLOT_PAD.bottom
  return {
    left,
    top,
    right,
    bottom,
    labelTop: bottom + SPECTRUM_HZ_LABEL_OFFSET,
    labelBottom: cssHeight,
  }
}
