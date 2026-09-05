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
  character: number
  space: number
  grain: number
  dirt: number
  tight: number
  ink: Rgb
}

const COLD: Rgb = { r: 148, g: 186, b: 214 }
const WARM: Rgb = { r: 236, g: 164, b: 64 }
const DARK: Rgb = { r: 58, g: 38, b: 28 }
const LIGHT: Rgb = { r: 255, g: 236, b: 206 }
const GRIT: Rgb = { r: 92, g: 78, b: 62 }

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
  const character = values.character
  const space = Math.max(0, values.space)
  const echo = Math.max(0, values.echo)
  const grain = Math.max(0, values.grain)
  const dirt = Math.max(0, values.dirt)
  const tight = Math.max(0, values.tight)
  const warmth = 0.48 + character * 0.28 - dirt * 0.18
  const glow = 0.24 + Math.max(0, character) * 0.5 + space * 0.12 - dirt * 0.08
  let ink = lensInk(Math.min(1, Math.max(0, warmth)), Math.min(1, Math.max(0.08, glow)))
  if (dirt > 0.08) ink = mixRgb(ink, GRIT, dirt * 0.55)
  const motion = reducedMotion ? 0 : grain * 0.55 + space * 0.12
  return {
    sharpness: 0.42 + character * 0.32 - dirt * 0.12 + tight * 0.1,
    glow: Math.min(1, Math.max(0, glow)),
    warmth: Math.min(1, Math.max(0, warmth)),
    depth: 0.28 + space * 0.55,
    mass: 0.42 + grain * 0.22 - tight * 0.22,
    motion,
    haze: 0.1 + space * 0.52,
    echo,
    character,
    space,
    grain,
    dirt,
    tight,
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
    '--sensory-character': String(visual.character),
    '--sensory-space': String(visual.space),
    '--sensory-grain': String(visual.grain),
    '--sensory-dirt': String(visual.dirt),
    '--sensory-tight': String(visual.tight),
    '--lens-ink-r': String(visual.ink.r),
    '--lens-ink-g': String(visual.ink.g),
    '--lens-ink-b': String(visual.ink.b),
  }
}
