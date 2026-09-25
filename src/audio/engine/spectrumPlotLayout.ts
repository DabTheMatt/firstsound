/** CSS pixels reserved around the FFT plot. Top fits note labels; bottom is the Hz band. */
export const SPECTRUM_PLOT_PAD = { left: 44, right: 12, top: 18, bottom: 40 }

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
