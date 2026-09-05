import { SENSORY_AXIS_IDS, type SensoryAxisId } from '../sensoryParameters'
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
  mod: number
  drift: number
  pan: number
  zoom: number
  activeAxis: SensoryAxisId | null
  ink: Rgb
  inkLeft: Rgb
  inkRight: Rgb
  inkRed: Rgb
  inkGreen: Rgb
  inkBlue: Rgb
}

const COLD: Rgb = { r: 148, g: 186, b: 214 }
const WARM: Rgb = { r: 236, g: 164, b: 64 }
const DARK: Rgb = { r: 58, g: 38, b: 28 }
const LIGHT: Rgb = { r: 255, g: 236, b: 206 }
const GRIT: Rgb = { r: 92, g: 78, b: 62 }

export const AXIS_TINT: Record<SensoryAxisId, Rgb> = {
  character: { r: 255, g: 196, b: 92 },
  space: { r: 96, g: 210, b: 255 },
  echo: { r: 196, g: 128, b: 255 },
  grain: { r: 140, g: 255, b: 176 },
  dirt: { r: 232, g: 96, b: 48 },
  tight: { r: 236, g: 236, b: 230 },
  mod: { r: 255, g: 92, b: 168 },
  drift: { r: 92, g: 168, b: 255 },
  pan: { r: 255, g: 214, b: 120 },
}

const DRIFT_RIGHT: Rgb = { r: 255, g: 168, b: 72 }
const CHROMA_R: Rgb = { r: 255, g: 72, b: 48 }
const CHROMA_G: Rgb = { r: 72, g: 255, b: 140 }
const CHROMA_B: Rgb = { r: 64, g: 140, b: 255 }

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

/** Dissolve each axis tint into the wash like successive watercolors. */
export function watercolorMix(values: SensoryValues, active: SensoryAxisId | null, paper: Rgb): Rgb {
  let ink = paper
  for (const id of SENSORY_AXIS_IDS) {
    const mag = Math.abs(values[id])
    if (mag < 0.015) continue
    const focus = active === id ? 0.18 : 0
    ink = mixRgb(ink, AXIS_TINT[id], Math.min(0.78, mag * 0.52 + focus))
  }
  return ink
}

export function spaceZoom(space: number): number {
  const s = Math.min(1, Math.max(0, space))
  return 1.46 - s * 0.94
}

export function sensoryVisualState(
  values: SensoryValues,
  reducedMotion: boolean,
  activeAxis: SensoryAxisId | null = null,
): SensoryVisualState {
  const character = values.character
  const space = Math.max(0, values.space)
  const echo = Math.max(0, values.echo)
  const grain = Math.max(0, values.grain)
  const dirt = Math.max(0, values.dirt)
  const tight = Math.max(0, values.tight)
  const mod = Math.max(0, values.mod)
  const drift = Math.max(0, values.drift)
  const pan = Math.max(0, values.pan)

  const warmth = 0.42 + character * 0.48 - dirt * 0.28
  const glow = 0.2 + Math.max(0, character) * 0.62 + space * 0.18 - dirt * 0.12
  let ink = lensInk(Math.min(1, Math.max(0, warmth)), Math.min(1, Math.max(0.08, glow)))
  if (dirt > 0.08) ink = mixRgb(ink, GRIT, dirt * 0.55)
  ink = watercolorMix(values, activeAxis, ink)

  const motion = reducedMotion ? 0 : mod * 0.85 + grain * 0.18 + pan * 0.4
  const zoom = spaceZoom(space)
  return {
    sharpness: 0.42 + character * 0.4 - dirt * 0.16 + tight * 0.14,
    glow: Math.min(1, Math.max(0, glow)),
    warmth: Math.min(1, Math.max(0, warmth)),
    depth: 0.12 + space * 0.78,
    mass: 0.5 + (1 - space) * 0.28 + grain * 0.1 - tight * 0.28,
    motion,
    haze: 0.04 + space * 0.72,
    echo,
    character,
    space,
    grain,
    dirt,
    tight,
    mod,
    drift,
    pan,
    zoom,
    activeAxis,
    ink,
    inkLeft: mixRgb(ink, AXIS_TINT.drift, 0.45 + drift * 0.5),
    inkRight: mixRgb(ink, DRIFT_RIGHT, 0.45 + drift * 0.5),
    inkRed: mixRgb(ink, CHROMA_R, 0.55 + drift * 0.4),
    inkGreen: mixRgb(ink, CHROMA_G, 0.4 + drift * 0.3),
    inkBlue: mixRgb(ink, CHROMA_B, 0.55 + drift * 0.4),
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
    '--sensory-mod': String(visual.mod),
    '--sensory-drift': String(visual.drift),
    '--sensory-pan': String(visual.pan),
    '--sensory-zoom': String(visual.zoom),
    '--lens-ink-r': String(visual.ink.r),
    '--lens-ink-g': String(visual.ink.g),
    '--lens-ink-b': String(visual.ink.b),
  }
}
