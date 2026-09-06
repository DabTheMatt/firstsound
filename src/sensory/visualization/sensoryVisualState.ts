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
  pan: { r: 180, g: 180, b: 176 },
  veil: { r: 120, g: 122, b: 128 },
  halo: { r: 210, g: 210, b: 206 },
  well: { r: 88, g: 86, b: 82 },
  bloom: { r: 186, g: 214, b: 255 },
  plate: { r: 220, g: 196, b: 160 },
  spring: { r: 180, g: 210, b: 92 },
  shimmer: { r: 255, g: 230, b: 140 },
  reverse: { r: 168, g: 140, b: 255 },
  gate: { r: 200, g: 90, b: 110 },
  fuzz: { r: 196, g: 72, b: 48 },
  crush: { r: 96, g: 210, b: 140 },
  tape: { r: 196, g: 140, b: 72 },
  fold: { r: 255, g: 120, b: 196 },
  vinyl: { r: 72, g: 72, b: 68 },
}

const DRIFT_RIGHT: Rgb = { r: 255, g: 168, b: 72 }
const CHROMA_R: Rgb = { r: 255, g: 72, b: 48 }
const CHROMA_G: Rgb = { r: 72, g: 255, b: 140 }
const CHROMA_B: Rgb = { r: 64, g: 140, b: 255 }

export type RidgePalette = {
  warm: Rgb
  mid: Rgb
  cool: Rgb
}

export const DUSK_RIDGE: RidgePalette = {
  warm: { r: 236, g: 92, b: 36 },
  mid: { r: 248, g: 242, b: 232 },
  cool: { r: 56, g: 196, b: 210 },
}

/** Lateral mountain wash: warm left, cream center, cool right, tinted by ink. */
export function ridgeInk(fill: Rgb, palette: RidgePalette): { left: Rgb; mid: Rgb; right: Rgb } {
  return {
    left: mixRgb(palette.warm, fill, 0.12),
    mid: mixRgb(palette.mid, fill, 0.08),
    right: mixRgb(palette.cool, fill, 0.12),
  }
}

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

/** Dissolve each axis tint into the wash like successive watercolors. Keep paper readable. */
export function watercolorMix(values: SensoryValues, active: SensoryAxisId | null, paper: Rgb): Rgb {
  let ink = paper
  for (const id of SENSORY_AXIS_IDS) {
    const mag = Math.abs(values[id])
    if (mag < 0.015) continue
    const focus = active === id ? 0.1 : 0
    ink = mixRgb(ink, AXIS_TINT[id], Math.min(0.28, mag * 0.2 + focus))
  }
  return ink
}

export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: lerpNum(a.r, b.r, t),
    g: lerpNum(a.g, b.g, t),
    b: lerpNum(a.b, b.b, t),
  }
}

/** Ease visual fields so knobs retint the landscape instead of popping. */
export function lerpVisualState(from: SensoryVisualState, to: SensoryVisualState, t: number): SensoryVisualState {
  const u = Math.min(1, Math.max(0, t))
  return {
    sharpness: lerpNum(from.sharpness, to.sharpness, u),
    glow: lerpNum(from.glow, to.glow, u),
    warmth: lerpNum(from.warmth, to.warmth, u),
    depth: lerpNum(from.depth, to.depth, u),
    mass: lerpNum(from.mass, to.mass, u),
    motion: lerpNum(from.motion, to.motion, u),
    haze: lerpNum(from.haze, to.haze, u),
    echo: lerpNum(from.echo, to.echo, u),
    character: lerpNum(from.character, to.character, u),
    space: lerpNum(from.space, to.space, u),
    grain: lerpNum(from.grain, to.grain, u),
    dirt: lerpNum(from.dirt, to.dirt, u),
    tight: lerpNum(from.tight, to.tight, u),
    mod: lerpNum(from.mod, to.mod, u),
    drift: lerpNum(from.drift, to.drift, u),
    pan: lerpNum(from.pan, to.pan, u),
    zoom: lerpNum(from.zoom, to.zoom, u),
    activeAxis: to.activeAxis,
    ink: lerpRgb(from.ink, to.ink, u),
    inkLeft: lerpRgb(from.inkLeft, to.inkLeft, u),
    inkRight: lerpRgb(from.inkRight, to.inkRight, u),
    inkRed: lerpRgb(from.inkRed, to.inkRed, u),
    inkGreen: lerpRgb(from.inkGreen, to.inkGreen, u),
    inkBlue: lerpRgb(from.inkBlue, to.inkBlue, u),
  }
}

/** Horizontal mood of the range: theme dusk wash, eased by warmth / space. */
export function landscapeStops(
  visual: SensoryVisualState,
  palette: RidgePalette = DUSK_RIDGE,
): { left: Rgb; crest: Rgb; right: Rgb } {
  const wash = ridgeInk(visual.ink, palette)
  return {
    left: mixRgb(wash.left, WARM, visual.warmth * 0.18),
    crest: mixRgb(wash.mid, LIGHT, visual.glow * 0.16),
    right: mixRgb(wash.right, COLD, visual.space * 0.1 + visual.drift * 0.08),
  }
}

/** Map engine pan (-100..100) to -1..1 for visuals. */
export function panNorm(panPct: number): number {
  return Math.max(-1, Math.min(1, panPct / 100))
}
export function spaceZoom(space: number): number {
  const s = Math.min(1, Math.max(0, space))
  return 0.72 + s * 0.54
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
  const veil = Math.max(0, values.veil)
  const halo = Math.max(0, values.halo)
  const well = Math.max(0, values.well)
  const bloom = Math.max(0, values.bloom)
  const plate = Math.max(0, values.plate)
  const spring = Math.max(0, values.spring)
  const shimmer = Math.max(0, values.shimmer)
  const reverse = Math.max(0, values.reverse)
  const fuzz = Math.max(0, values.fuzz)
  const crush = Math.max(0, values.crush)
  const tape = Math.max(0, values.tape)
  const fold = Math.max(0, values.fold)
  const vinyl = Math.max(0, values.vinyl)

  const warmth = 0.42 + character * 0.48 - dirt * 0.28 - veil * 0.12 + halo * 0.08 + tape * 0.12 + plate * 0.08 - vinyl * 0.1
  const glow = 0.2 + Math.max(0, character) * 0.62 + space * 0.18 + halo * 0.28 + bloom * 0.22 + shimmer * 0.3 - dirt * 0.12 - well * 0.1 - fuzz * 0.08
  let ink = lensInk(Math.min(1, Math.max(0, warmth)), Math.min(1, Math.max(0.08, glow)))
  if (dirt > 0.08) ink = mixRgb(ink, GRIT, dirt * 0.55)
  if (fuzz > 0.08) ink = mixRgb(ink, AXIS_TINT.fuzz, fuzz * 0.4)
  if (crush > 0.08) ink = mixRgb(ink, AXIS_TINT.crush, crush * 0.35)
  ink = watercolorMix(values, activeAxis, ink)

  const motion = reducedMotion ? 0 : mod * 0.85 + grain * 0.18 + pan * 0.4 + fold * 0.12
  const zoom = spaceZoom(space)
  return {
    sharpness: 0.42 + character * 0.4 - dirt * 0.16 + tight * 0.14 - fuzz * 0.1,
    glow: Math.min(1, Math.max(0, glow)),
    warmth: Math.min(1, Math.max(0, warmth)),
    depth: 0.12 + space * 0.78 + well * 0.22 + veil * 0.16 + bloom * 0.18 + reverse * 0.1,
    mass: 0.42 + space * 0.4 + grain * 0.1 + well * 0.12 - tight * 0.28 + spring * 0.06,
    motion,
    haze: 0.04 + space * 0.72 + veil * 0.38 + bloom * 0.2 + vinyl * 0.12,
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
