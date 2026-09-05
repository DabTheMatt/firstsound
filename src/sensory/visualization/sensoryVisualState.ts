import type { SensoryValues } from '../sensoryState'

export type Rgb = { r: number; g: number; b: number }

export type SensoryVisualState = {
  sharpness: number
  glow: number
  warmth: number
  depth: number
  mass: number
  motion: number
  haze: number
  echo: number
  ink: Rgb
}

const COLD: Rgb = { r: 148, g: 186, b: 214 }
const WARM: Rgb = { r: 236, g: 164, b: 64 }
const DARK: Rgb = { r: 58, g: 38, b: 28 }
const LIGHT: Rgb = { r: 255, g: 236, b: 206 }

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const u = Math.min(1, Math.max(0, t))
  return {
    r: a.r + (b.r - a.r) * u,
    g: a.g + (b.g - a.g) * u,
    b: a.b + (b.b - a.b) * u,
  }
}

export function rgbCss(c: Rgb, alpha = 1): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`
}

export function lensInk(warmth: number, glow: number): Rgb {
  const temp = mixRgb(COLD, WARM, warmth)
  return mixRgb(mixRgb(temp, DARK, 1 - glow), LIGHT, glow * 0.45)
}

export function sensoryVisualState(values: SensoryValues, reducedMotion: boolean): SensoryVisualState {
  const motion = reducedMotion ? 0 : Math.max(0, values.motion) * 0.7 + Math.max(0, values.wildness) * 0.5
  const warmth = 0.5 + values.warmth * 0.45
  const glow = 0.22 + Math.max(0, values.brightness) * 0.62 + Math.max(0, -values.brightness) * -0.12
  const ink = lensInk(warmth, Math.min(1, Math.max(0.08, glow)))
  return {
    sharpness: 0.45 + values.brightness * 0.35 - Math.max(0, -values.brightness) * 0.2,
    glow: Math.min(1, Math.max(0, glow)),
    warmth,
    depth: 0.35 + Math.max(0, values.distance) * 0.5,
    mass: 0.45 + values.fullness * 0.3,
    motion,
    haze: 0.15 + Math.max(0, values.distance) * 0.35 + Math.max(0, -values.brightness) * 0.2,
    echo: Math.max(0, values.echo),
    ink,
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
    '--sensory-echo': String(visual.echo),
    '--lens-ink-r': String(visual.ink.r),
    '--lens-ink-g': String(visual.ink.g),
    '--lens-ink-b': String(visual.ink.b),
  }
}
