import { eqResponseCurveStyle } from './eqPlot'
import { mixCssColor } from '../../theme/cssColor'

/** How far the filter stroke moves from the secondary accent toward the foreground. */
export const FILTER_CURVE_LIFT = 0.72

export type ProcessorCurveKind = 'eq' | 'filter'

export type ProcessorCurveInk = 'eqCurve' | 'accentSecondary'

/** Solid EQ curve vs a heavier dash-dot filter curve. */
export function processorCurveStyle(
  kind: ProcessorCurveKind,
  bypassed: boolean,
  dpr: number,
): { ink: ProcessorCurveInk; dash: number[]; width: number; alpha: number } {
  if (kind === 'filter') {
    return {
      ink: 'accentSecondary',
      dash: bypassed ? [2 * dpr, 3.5 * dpr] : [14 * dpr, 5 * dpr, 2.5 * dpr, 5 * dpr],
      width: Math.max(2.4, dpr * (bypassed ? 1.6 : 2.75)),
      alpha: bypassed ? 0.38 : 0.95,
    }
  }
  const eq = eqResponseCurveStyle('stored', bypassed, dpr)
  return {
    ink: 'eqCurve',
    dash: bypassed ? [5 * dpr, 4 * dpr] : [],
    width: eq.width,
    alpha: eq.alpha,
  }
}

/**
 * Secondary accent, pulled toward the foreground so a dashed filter stays visible
 * on both dark and light themes without taking the EQ curve color.
 */
export function filterCurveColor(accentSecondary: string, textPrimary: string): string {
  return mixCssColor(accentSecondary || textPrimary, textPrimary, FILTER_CURVE_LIFT)
}

/** Compact key only when EQ and Filter curves are on screen together. */
export function shouldShowResponseLegend(eqCurve: boolean, filterCurve: boolean): boolean {
  return eqCurve && filterCurve
}
