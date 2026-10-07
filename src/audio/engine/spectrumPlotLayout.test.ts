import { describe, expect, it } from 'vitest'
import { FREQ_SCALE_HZ } from './pitchScale'
import { hzToX, type FreqScaleKind } from './freqScale'
import {
  SPECTRUM_HZ_LABEL_OFFSET,
  SPECTRUM_PLOT_PAD,
  SPECTRUM_PLOT_PAD_COMPACT,
  SPECTRUM_FOCUS_HZ_LABEL_OFFSET,
  SPECTRUM_PLOT_PAD_FOCUS,
  SPECTRUM_PLOT_PAD_PHONE_EQ,
  phoneFrequencyTicks,
  focusKnobClearancePx,
  focusPlotPad,
  spectrumPlotBox,
  spectrumPlotPad,
} from './spectrumPlotLayout'

const SCALES: FreqScaleKind[] = ['log', 'linear', 'mel']
const WIDTHS = [280, 640, 1280, 1920]

describe('spectrumPlotBox', () => {
  it('keeps the Hz label band strictly below the plot on every scale and width', () => {
    for (const width of WIDTHS) {
      const box = spectrumPlotBox(width, 240)
      expect(box.right).toBeGreaterThan(box.left)
      expect(box.bottom).toBeGreaterThan(box.top)
      expect(box.labelTop).toBe(box.bottom + SPECTRUM_HZ_LABEL_OFFSET)
      expect(box.labelTop).toBeGreaterThan(box.bottom)
      expect(box.labelBottom - box.bottom).toBe(SPECTRUM_PLOT_PAD.bottom)
      expect(SPECTRUM_HZ_LABEL_OFFSET + 10).toBeLessThanOrEqual(SPECTRUM_PLOT_PAD.bottom)
      for (const scale of SCALES) {
        for (const hz of FREQ_SCALE_HZ) {
          const x = hzToX(hz, 10, 22000, box.left, box.right, scale)
          expect(x).toBeGreaterThanOrEqual(box.left)
          expect(x).toBeLessThanOrEqual(box.right)
        }
      }
    }
  })
})

describe('phone spectrum scale', () => {
  it('uses a tight inset and fewer labels on narrow widths', () => {
    expect(SPECTRUM_PLOT_PAD_COMPACT.left).toBeLessThan(SPECTRUM_PLOT_PAD.left)
    expect(SPECTRUM_PLOT_PAD_COMPACT.bottom).toBeLessThan(12)
    expect(phoneFrequencyTicks(320).length).toBeLessThanOrEqual(4)
    expect(SPECTRUM_PLOT_PAD_FOCUS.left).toBeLessThan(SPECTRUM_PLOT_PAD.left)
    expect(SPECTRUM_PLOT_PAD_FOCUS.top).toBe(0)
    expect(SPECTRUM_PLOT_PAD_FOCUS.bottom).toBeGreaterThanOrEqual(SPECTRUM_FOCUS_HZ_LABEL_OFFSET + 12)
    expect(SPECTRUM_PLOT_PAD_FOCUS.bottom).toBeLessThan(SPECTRUM_PLOT_PAD.bottom)
    expect(spectrumPlotPad({ focus: true })).toBe(SPECTRUM_PLOT_PAD_FOCUS)
    expect(spectrumPlotPad({ compact: true })).toBe(SPECTRUM_PLOT_PAD_COMPACT)
    expect(spectrumPlotPad({ phoneEq: true })).toBe(SPECTRUM_PLOT_PAD_PHONE_EQ)
    expect(spectrumPlotPad({ phoneEq: true, focus: true })).toBe(SPECTRUM_PLOT_PAD_FOCUS)
    expect(SPECTRUM_PLOT_PAD_PHONE_EQ.left).toBeLessThan(SPECTRUM_PLOT_PAD.left)
    expect(SPECTRUM_PLOT_PAD_PHONE_EQ.left).toBeGreaterThan(12)
    expect(spectrumPlotPad({})).toBe(SPECTRUM_PLOT_PAD)
    expect(focusKnobClearancePx(40, 180, 16)).toBe(156)
    expect(focusKnobClearancePx(200, 180)).toBe(0)
    expect(focusKnobClearancePx(0, 400, 16, 200)).toBe(80)
    const cleared = focusPlotPad(SPECTRUM_PLOT_PAD_FOCUS, 156)
    expect(cleared.top).toBe(156)
    expect(cleared.right).toBeGreaterThan(SPECTRUM_PLOT_PAD_FOCUS.right)
    expect(cleared.bottom).toBe(SPECTRUM_PLOT_PAD_FOCUS.bottom)
    expect(phoneFrequencyTicks(390)).toContain(1000)
    expect(phoneFrequencyTicks(430).length).toBeGreaterThan(phoneFrequencyTicks(320).length)
  })
})
