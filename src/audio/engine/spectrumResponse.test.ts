import { describe, expect, it } from 'vitest'
import { isDarkColor } from '../../theme/cssColor'
import { eqResponseCurveStyle } from './eqPlot'
import { filterCurveColor, processorCurveStyle, shouldShowResponseLegend } from './spectrumResponse'

describe('processor response curves', () => {
  it('draws the filter as a heavier dash-dot and EQ as a solid curve', () => {
    const eq = processorCurveStyle('eq', false, 1)
    const filter = processorCurveStyle('filter', false, 1)
    const stored = eqResponseCurveStyle('stored', false, 1)
    expect(eq.ink).toBe('eqCurve')
    expect(eq.dash).toEqual([])
    expect(eq.width).toBeCloseTo(stored.width)
    expect(filter.ink).toBe('accentSecondary')
    expect(filter.ink).not.toBe(eq.ink)
    expect(filter.dash.length).toBeGreaterThan(2)
    expect(filter.width).toBeGreaterThan(eq.width)
    expect(filter.dash).not.toEqual(processorCurveStyle('eq', true, 1).dash)
  })

  it('keeps a bypassed filter from copying the solid EQ stroke', () => {
    const filter = processorCurveStyle('filter', true, 2)
    expect(filter.dash.length).toBeGreaterThan(0)
    expect(filter.alpha).toBeLessThan(processorCurveStyle('filter', false, 2).alpha)
  })

  it('lifts a dark secondary accent toward the foreground and darkens it on a light theme', () => {
    const onDark = filterCurveColor('#b98534', '#e8e6df')
    const onLight = filterCurveColor('#c18a34', '#202321')
    expect(isDarkColor(onDark)).toBe(false)
    expect(isDarkColor(onLight)).toBe(true)
    expect(onDark.toLowerCase()).not.toBe('#e6ad48')
    expect(onLight.toLowerCase()).not.toBe('#a96e13')
  })

  it('shows a legend only when EQ and Filter curves are both visible', () => {
    expect(shouldShowResponseLegend(true, true)).toBe(true)
    expect(shouldShowResponseLegend(true, false)).toBe(false)
    expect(shouldShowResponseLegend(false, true)).toBe(false)
    expect(shouldShowResponseLegend(false, false)).toBe(false)
  })
})
