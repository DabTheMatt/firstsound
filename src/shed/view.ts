export const SCENE_WIDTH = 1000
export const SCENE_HEIGHT = 640

export const ZOOM_MIN = 0.7
export const ZOOM_MAX = 2.2

export const PAN_STEP = 48

export type SceneCamera = {
  zoom: number
  panX: number
  panY: number
}

export function defaultCamera(): SceneCamera {
  return { zoom: 1, panX: 0, panY: 0 }
}

export function nextZoom(zoom: number, direction: 'in' | 'out' | 'reset'): number {
  if (direction === 'reset') return 1
  const factor = direction === 'in' ? 1.15 : 1 / 1.15
  const next = zoom * factor
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
  return Math.round(clamped * 1000) / 1000
}

export function clampCamera(camera: SceneCamera): SceneCamera {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number.isFinite(camera.zoom) ? camera.zoom : 1))
  const limitX = SCENE_WIDTH * (Math.max(zoom, 1) - 0.35)
  const limitY = SCENE_HEIGHT * (Math.max(zoom, 1) - 0.35)
  const pan = (value: number, limit: number) => {
    if (!Number.isFinite(value)) return 0
    return Math.min(limit, Math.max(-limit, value))
  }
  return {
    zoom: Math.round(zoom * 1000) / 1000,
    panX: Math.round(pan(camera.panX, limitX) * 10) / 10,
    panY: Math.round(pan(camera.panY, limitY) * 10) / 10,
  }
}

export function panCamera(camera: SceneCamera, dx: number, dy: number): SceneCamera {
  return clampCamera({ ...camera, panX: camera.panX + dx, panY: camera.panY + dy })
}

export function panView(camera: SceneCamera, direction: 'left' | 'right' | 'up' | 'down'): SceneCamera {
  switch (direction) {
    case 'left':
      return panCamera(camera, -PAN_STEP, 0)
    case 'right':
      return panCamera(camera, PAN_STEP, 0)
    case 'up':
      return panCamera(camera, 0, -PAN_STEP)
    case 'down':
      return panCamera(camera, 0, PAN_STEP)
    default:
      return camera
  }
}

export function viewTransform(camera: SceneCamera): string {
  const next = clampCamera(camera)
  const cx = SCENE_WIDTH / 2
  const cy = SCENE_HEIGHT / 2
  return `translate(${cx} ${cy}) scale(${next.zoom}) translate(${(-cx + next.panX).toFixed(1)} ${(-cy + next.panY).toFixed(1)})`
}

/** Same fit the scene uses when a drawing is larger than the parchment. */
export function elementFit(width: number, height: number): number {
  return Math.min(height > 520 ? 520 / height : 1, width > 640 ? 640 / width : 1)
}

/** Architectural position in scene units. The camera does not change this point. */
export function elementScenePoint(element: { x: number; y: number }): { x: number; y: number } {
  return { x: element.x * SCENE_WIDTH, y: element.y * SCENE_HEIGHT }
}
