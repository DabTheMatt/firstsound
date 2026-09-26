import { describe, expect, it } from 'vitest'
import { PARAMS } from '../../audio/parameters/definitions'
import { PL_PARAMS } from '../../i18n/plParams'
import type { ParamId } from '../../audio/parameters/types'
import {
  PARAM_LABEL_MIN_PX,
  measureParamLabelPx,
  presentParamLabel,
  type ParamLabelFit,
} from './paramLabelFit'

const METRICS: Record<ParamLabelFit, { sizePx: number; trackingEm: number }> = {
  normal: { sizePx: 9, trackingEm: 0.045 },
  tight: { sizePx: 9, trackingEm: 0.01 },
  compact: { sizePx: 8, trackingEm: 0 },
  snug: { sizePx: 7.5, trackingEm: 0 },
}

describe('presentParamLabel', () => {
  it('keeps Resonance unabbreviated on one line', () => {
    const shown = presentParamLabel('Resonance')
    expect(shown.text).toBe('Resonance')
    expect(shown.fit).toBe('normal')
    const { sizePx, trackingEm } = METRICS[shown.fit]
    expect(measureParamLabelPx(shown.text, sizePx, trackingEm)).toBeLessThanOrEqual(PARAM_LABEL_MIN_PX)
  })

  it('keeps the Polish resonance name', () => {
    const shown = presentParamLabel('Rezonans')
    expect(shown.text).toBe('Rezonans')
    expect(shown.fit).toBe('normal')
  })

  it('keeps Shimmer Pitch when it fits the shared slot', () => {
    const shown = presentParamLabel('Shimmer Pitch')
    expect(shown.text).toBe('Shimmer Pitch')
    expect(shown.fit).not.toBe('snug')
  })

  it('uses a smaller size before abbreviating a long Polish name', () => {
    const shown = presentParamLabel('Odstęp grzebienia')
    expect(shown.text).toBe('Odstęp grzebienia')
    expect(shown.fit === 'compact' || shown.fit === 'snug').toBe(true)
  })

  it('does not invent an abbreviation when snug type still overflows', () => {
    const label = 'Extraordinary Parameter Name'
    const shown = presentParamLabel(label)
    expect(shown.text).toBe(label)
    expect(shown.fit).toBe('snug')
  })

  it('fits every parameter name into the shared label slot', () => {
    const labels = new Set<string>([
      ...Object.values(PARAMS).map((def) => def.label),
      ...(Object.keys(PL_PARAMS) as ParamId[]).map((id) => PL_PARAMS[id]),
      'Freq',
      'Gain',
      'Width',
      'Q',
      'Slope',
      'Spacing',
      'Teeth',
      'Base',
      'Fade In',
      'Fade Out',
    ])
    const overflow: string[] = []
    for (const label of labels) {
      const shown = presentParamLabel(label)
      const { sizePx, trackingEm } = METRICS[shown.fit]
      const width = measureParamLabelPx(shown.text, sizePx, trackingEm)
      if (width > PARAM_LABEL_MIN_PX) overflow.push(`${label} → ${shown.text} (${shown.fit}, ${width.toFixed(1)}px)`)
    }
    expect(overflow).toEqual([])
  })
})
