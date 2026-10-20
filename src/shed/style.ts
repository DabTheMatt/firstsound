import { SHED_GOLD, SHED_INK, SHED_WARM_GRAY } from './palette'

/**
 * One illustrator grammar for every SHED drawing.
 * Components read these values instead of inventing their own ink.
 * Anchors stay exact; only the stroke is allowed to wander.
 */
export const SHED_STYLE = {
  ink: SHED_INK,
  constructionLine: SHED_WARM_GRAY,
  ornament: SHED_GOLD,
  strokeBody: 1.15,
  strokeOpening: 0.7,
  strokeHairline: 0.6,
  strokeConstruction: 0.55,
  strokeAccent: 0.65,
  washOpacity: 0.94,
  openingOpacity: 0.92,
  hairlineOpacity: 0.42,
  constructionOpacity: 0.55,
  constructionDash: '3.5 3.5',
  sideShade: 0.28,
  sideDirection: 'right' as const,
  strokeWander: 0.28,
} as const
