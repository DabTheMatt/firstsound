/** CSS pixels reserved around the FFT plot. Top fits note labels; bottom is the Hz band. */
export const SPECTRUM_PLOT_PAD = { left: 44, right: 12, top: 18, bottom: 40 }

/**
 * Phone plot inset. Scale text is drawn inside the graph, so the canvas
 * keeps only a few pixels of air for touch and anti-aliased strokes.
 */
export const SPECTRUM_PLOT_PAD_COMPACT = { left: 4, right: 4, top: 6, bottom: 4 }

/**
 * Focused EQ. The base inset is tight; EQ Focus adds clearance under the knobs
 * and a gutter for the range control.
 * The bottom band holds frequency labels under the axis line.
 */
export const SPECTRUM_PLOT_PAD_FOCUS = { left: 4, right: 4, top: 0, bottom: 22 }

/** Air between the bottom of the EQ Focus knobs and the top of the plot. */
export const SPECTRUM_FOCUS_KNOB_GAP = 16

/** Right gutter so EQ Focus bars end before the 60 / 90 / 120 control. */
export const SPECTRUM_FOCUS_RANGE_GUTTER = 56

const FOCUS_KNOB_CLEARANCE_MAX = 320

/** Pixels from the canvas top to just under the floating EQ Focus knobs. */
export function focusKnobClearancePx(
  canvasTop: number,
  wellBottom: number,
  gap = SPECTRUM_FOCUS_KNOB_GAP,
  canvasHeight = Number.POSITIVE_INFINITY,
): number {
  if (!Number.isFinite(canvasTop) || !Number.isFinite(wellBottom)) return 0
  const raw = Math.round(wellBottom - canvasTop + gap)
  const room = Number.isFinite(canvasHeight) ? Math.max(0, canvasHeight - 120) : FOCUS_KNOB_CLEARANCE_MAX
  return Math.min(FOCUS_KNOB_CLEARANCE_MAX, room, Math.max(0, raw))
}

/** Drop the focus plot below the knobs and leave room for the range rail. */
export function focusPlotPad(
  base: { left: number; right: number; top: number; bottom: number },
  clearancePx: number,
): { left: number; right: number; top: number; bottom: number } {
  return {
    ...base,
    top: base.top + Math.max(0, clearancePx),
    right: Math.max(base.right, SPECTRUM_FOCUS_RANGE_GUTTER),
  }
}

/** Gap from the focus axis line down to the top of the Hz labels. */
export const SPECTRUM_FOCUS_HZ_LABEL_OFFSET = 4

/**
 * Phone EQ. The dB scale sits in a narrow gutter so the curve can use the
 * width that the desktop 44px inset was leaving empty.
 */
export const SPECTRUM_PLOT_PAD_PHONE_EQ = { left: 22, right: 8, top: 10, bottom: 26 }

export function spectrumPlotPad(input: { compact?: boolean; focus?: boolean; phoneEq?: boolean }): {
  left: number
  right: number
  top: number
  bottom: number
} {
  if (input.focus) return SPECTRUM_PLOT_PAD_FOCUS
  if (input.phoneEq) return SPECTRUM_PLOT_PAD_PHONE_EQ
  if (input.compact) return SPECTRUM_PLOT_PAD_COMPACT
  return SPECTRUM_PLOT_PAD
}

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
