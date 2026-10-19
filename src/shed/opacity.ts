/**
 * Building washes can stay clear so a front building shows the one behind it,
 * or cover that drawing. Ink, construction lines, and the hit target stay put.
 */

const STAIN = 0.22
export const GLASS_FILL = 0.42
export const SOLID_FILL = 0.97

export function buildingsAreTransparent(scene: { transparentBuildings?: boolean }): boolean {
  return scene.transparentBuildings !== false
}

export function presentedFillOpacity(
  part: { fill: string; fillOpacity?: number },
  transparent: boolean,
): number | undefined {
  if (!part.fill || part.fill === 'none') return part.fillOpacity
  if (part.fillOpacity === 0) return 0
  const current = part.fillOpacity ?? 1
  if (current < STAIN) return current
  return transparent ? Math.min(current, GLASS_FILL) : Math.max(current, SOLID_FILL)
}
