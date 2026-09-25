import { describe, expect, it } from 'vitest'
import { FREQ_SCALE_HZ } from './pitchScale'
import { hzToX, type FreqScaleKind } from './freqScale'
import { SPECTRUM_HZ_LABEL_OFFSET, SPECTRUM_PLOT_PAD, spectrumPlotBox } from './spectrumPlotLayout'

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
