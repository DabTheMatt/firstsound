import type { SceneCamera } from '../view'
import { CITY_BOUNDS, CITY_HEIGHT, CITY_WIDTH } from './map'

const CENTER_X = (CITY_BOUNDS.minX + CITY_BOUNDS.maxX) / 2
const CENTER_Y = (CITY_BOUNDS.minY + CITY_BOUNDS.maxY) / 2

export const CITY_ZOOM_MIN = 0.8
export const CITY_ZOOM_MAX = 6

export function nextCityZoom(zoom: number, direction: 'in' | 'out' | 'reset'): number {
  if (direction === 'reset') return 1
  const factor = direction === 'in' ? 1.18 : 1 / 1.18
  const next = Math.min(CITY_ZOOM_MAX, Math.max(CITY_ZOOM_MIN, zoom * factor))
  return Math.round(next * 1000) / 1000
}

export function clampCityCamera(camera: SceneCamera): SceneCamera {
  const zoom = Math.min(CITY_ZOOM_MAX, Math.max(CITY_ZOOM_MIN, Number.isFinite(camera.zoom) ? camera.zoom : 1))
  const limitX = CITY_WIDTH * (Math.max(zoom, 1) - 0.2)
  const limitY = CITY_HEIGHT * (Math.max(zoom, 1) - 0.2)
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

export function panCity(camera: SceneCamera, direction: 'left' | 'right' | 'up' | 'down'): SceneCamera {
  const step = 56
  switch (direction) {
    case 'left':
      return clampCityCamera({ ...camera, panX: camera.panX - step })
    case 'right':
      return clampCityCamera({ ...camera, panX: camera.panX + step })
    case 'up':
      return clampCityCamera({ ...camera, panY: camera.panY - step })
    case 'down':
      return clampCityCamera({ ...camera, panY: camera.panY + step })
    default:
      return camera
  }
}

/** Camera only. Plot and building coordinates stay in map meters. */
export function cityViewTransform(camera: SceneCamera): string {
  const next = clampCityCamera(camera)
  return `translate(${CENTER_X.toFixed(1)} ${CENTER_Y.toFixed(1)}) scale(${next.zoom}) translate(${(-CENTER_X + next.panX).toFixed(1)} ${(-CENTER_Y + next.panY).toFixed(1)})`
}
