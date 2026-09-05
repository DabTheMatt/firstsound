import type { SensoryValues } from '../sensoryState'

export type SensoryVisualState = {
  sharpness: number
  glow: number
  warmth: number
  depth: number
  mass: number
  motion: number
  haze: number
}

export function sensoryVisualState(values: SensoryValues, reducedMotion: boolean): SensoryVisualState {
  const motion = reducedMotion ? 0 : Math.max(0, values.motion) * 0.7 + Math.max(0, values.wildness) * 0.5
  return {
    sharpness: 0.45 + values.brightness * 0.35 - Math.max(0, -values.brightness) * 0.2,
    glow: 0.3 + Math.max(0, values.brightness) * 0.5,
    warmth: 0.5 + values.warmth * 0.4,
    depth: 0.35 + Math.max(0, values.distance) * 0.5,
    mass: 0.45 + values.fullness * 0.3,
    motion,
    haze: 0.15 + Math.max(0, values.distance) * 0.35 + Math.max(0, -values.brightness) * 0.2,
  }
}

export function visualCssVars(visual: SensoryVisualState): Record<string, string> {
  return {
    '--sensory-sharp': String(visual.sharpness),
    '--sensory-glow': String(visual.glow),
    '--sensory-warm': String(visual.warmth),
    '--sensory-depth': String(visual.depth),
    '--sensory-mass': String(visual.mass),
    '--sensory-motion': String(visual.motion),
    '--sensory-haze': String(visual.haze),
  }
}
