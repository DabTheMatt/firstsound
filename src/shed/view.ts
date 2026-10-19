export const SCENE_WIDTH = 1000
export const SCENE_HEIGHT = 640

export const ZOOM_MIN = 0.7
export const ZOOM_MAX = 2.2

export function nextZoom(zoom: number, direction: 'in' | 'out' | 'reset'): number {
  if (direction === 'reset') return 1
  const factor = direction === 'in' ? 1.15 : 1 / 1.15
  const next = zoom * factor
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
  return Math.round(clamped * 1000) / 1000
}
