import { PARAMS } from '../audio/parameters/definitions'
import { applyParamValue } from '../audio/parameters/mapping'
import type { ParamId } from '../audio/parameters/types'
import type { EqBand, EqFilterType } from '../audio/engine/eqBands'
import { complementaryPct } from '../audio/fx/dryWet'
import type { DspSnapshot } from './mapping/mappingEngine'
import { SENSORY_SAFETY } from './mapping/safety'
import type { SensoryAxisId } from './sensoryParameters'
import type { SensoryValues } from './sensoryState'

/** Normalized pad position. x is hue, y is light (1) to dark (0). */
export type ColorSound = {
  x: number
  y: number
}

/** Center of the field. DSP offsets are zero here. */
export const NEUTRAL_COLOR_SOUND: ColorSound = { x: 0.5, y: 0.5 }

const NEUTRAL_EPS = 0.01

const FILTER_AXES: readonly SensoryAxisId[] = ['dark', 'thin', 'phone', 'notch', 'peak', 'comb', 'melt', 'sweep']

/** Absolute color-region weights, 0..1 except tone which is −1..1. */
type HueVec = {
  low: number
  body: number
  presence: number
  air: number
  saturation: number
  space: number
  width: number
  distance: number
  texture: number
  tone: number
}

const ZERO_VEC: HueVec = {
  low: 0,
  body: 0,
  presence: 0,
  air: 0,
  saturation: 0,
  space: 0,
  width: 0,
  distance: 0,
  texture: 0,
  tone: 0,
}

/**
 * Perceptual regions around the hue circle.
 * Cyan sits at the pad center so rest stays at the engine defaults after subtraction.
 * Neighbors overlap; circular distance keeps violet adjacent to red.
 */
const HUE_ANCHORS: readonly { h: number; v: HueVec }[] = [
  { h: 0, v: { low: 0.94, body: 0.88, presence: 0.05, air: 0.06, saturation: 0.9, space: 0.04, width: 0.08, distance: 0.03, texture: 0.12, tone: -0.7 } },
  { h: 0.08, v: { low: 0.82, body: 0.98, presence: 0.28, air: 0.16, saturation: 0.66, space: 0.06, width: 0.16, distance: 0.05, texture: 0.08, tone: -0.32 } },
  { h: 0.16, v: { low: 0.22, body: 0.18, presence: 1, air: 1, saturation: 0.3, space: 0.1, width: 0.32, distance: 0.06, texture: 0.04, tone: 0.8 } },
  { h: 0.34, v: { low: 0.12, body: 0.82, presence: 0.48, air: 0.55, saturation: 0.02, space: 0.28, width: 0.44, distance: 0.16, texture: 0.03, tone: 0.12 } },
  { h: 0.5, v: { low: 0.1, body: 0.22, presence: 0.3, air: 0.6, saturation: 0, space: 0.55, width: 0.62, distance: 0.42, texture: 0.02, tone: 0.02 } },
  { h: 0.67, v: { low: 0.02, body: 0.08, presence: 0.14, air: 0.42, saturation: 0, space: 1, width: 1, distance: 0.95, texture: 0.05, tone: 0 } },
  { h: 0.84, v: { low: 0.36, body: 0.42, presence: 0.46, air: 0.2, saturation: 0.48, space: 0.36, width: 0.46, distance: 0.26, texture: 1, tone: -0.2 } },
]

/** Signed macro around the neutral center. One movement drives several dimensions. */
export type ColorMacro = {
  hue: number
  /** 0 dark, 1 light. */
  light: number
  /** −1 dark, +1 light. */
  bright: number
  low: number
  body: number
  presence: number
  air: number
  saturation: number
  space: number
  width: number
  distance: number
  texture: number
  tone: number
  /** −1 closer / warm, +1 deeper / cool. */
  depth: number
  /** 0..1 near-field visual detail. */
  detail: number
}

type HueTone = {
  low: number
  body: number
  presence: number
  air: number
  sat: number
  wet: number
  distance: number
  width: number
  texture: number
  highCut: number
  tone: number
  delay: number
  mod: number
  stereo: number
}

export type ColorTimbre = HueTone & {
  /** -1 dark, +1 light. */
  bright: number
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function clamp01(n: number): number {
  return clamp(n, 0, 1)
}

export function clampColorSound(color: Partial<ColorSound> | null | undefined): ColorSound {
  return {
    x: clamp01(typeof color?.x === 'number' && Number.isFinite(color.x) ? color.x : NEUTRAL_COLOR_SOUND.x),
    y: clamp01(typeof color?.y === 'number' && Number.isFinite(color.y) ? color.y : NEUTRAL_COLOR_SOUND.y),
  }
}

export function colorSoundIsNeutral(color: ColorSound, eps = NEUTRAL_EPS): boolean {
  const c = clampColorSound(color)
  return Math.abs(c.x - NEUTRAL_COLOR_SOUND.x) <= eps && Math.abs(c.y - NEUTRAL_COLOR_SOUND.y) <= eps
}

export function colorSoundsEqual(a: ColorSound, b: ColorSound, eps = 1e-3): boolean {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

/** How far the pad sits from rest, 0 at the center and 1 toward the corners. */
export function colorSoundAmount(color: ColorSound): number {
  const c = clampColorSound(color)
  return clamp(Math.hypot(c.x - 0.5, c.y - 0.5) / 0.62, 0, 1)
}

function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 1 - d)
}

function lobe(hue: number, center: number, width = 0.2): number {
  const d = circularDistance(hue, center)
  if (d >= width) return 0
  return 0.5 * (1 + Math.cos(Math.PI * (d / width)))
}

function sampleHue(hue: number): HueVec {
  let weight = 0
  const acc: HueVec = { ...ZERO_VEC }
  for (const anchor of HUE_ANCHORS) {
    const w = lobe(hue, anchor.h)
    if (w <= 0) continue
    weight += w
    acc.low += anchor.v.low * w
    acc.body += anchor.v.body * w
    acc.presence += anchor.v.presence * w
    acc.air += anchor.v.air * w
    acc.saturation += anchor.v.saturation * w
    acc.space += anchor.v.space * w
    acc.width += anchor.v.width * w
    acc.distance += anchor.v.distance * w
    acc.texture += anchor.v.texture * w
    acc.tone += anchor.v.tone * w
  }
  if (weight <= 1e-6) return { ...ZERO_VEC }
  const scale = 1 / weight
  return {
    low: acc.low * scale,
    body: acc.body * scale,
    presence: acc.presence * scale,
    air: acc.air * scale,
    saturation: acc.saturation * scale,
    space: acc.space * scale,
    width: acc.width * scale,
    distance: acc.distance * scale,
    texture: acc.texture * scale,
    tone: acc.tone * scale,
  }
}

let neutralVec: HueVec | null = null

function hueDelta(hue: number): HueVec {
  neutralVec ??= sampleHue(NEUTRAL_COLOR_SOUND.x)
  const raw = sampleHue(hue)
  return {
    low: raw.low - neutralVec.low,
    body: raw.body - neutralVec.body,
    presence: raw.presence - neutralVec.presence,
    air: raw.air - neutralVec.air,
    saturation: raw.saturation - neutralVec.saturation,
    space: raw.space - neutralVec.space,
    width: raw.width - neutralVec.width,
    distance: raw.distance - neutralVec.distance,
    texture: raw.texture - neutralVec.texture,
    tone: raw.tone - neutralVec.tone,
  }
}

/**
 * Continuous color → sound macro.
 * Hue is circular. Lightness is an independent spectral and spatial tilt.
 * Values are signed offsets from the neutral center, not hard presets.
 */
export function mapColorToSound(hue: number, lightness: number): ColorMacro {
  const h = clamp01(hue)
  const y = clamp01(lightness)
  const delta = hueDelta(h)
  const bright = (y - 0.5) * 2
  const dark = Math.max(0, -bright)
  const light = Math.max(0, bright)
  const low = delta.low + dark * 0.46 - light * 0.1
  const body = delta.body + dark * 0.18
  const presence = delta.presence + light * 0.36 - dark * 0.24
  const air = delta.air + bright * 0.78
  const saturation = delta.saturation + dark * 0.1
  const space = delta.space + dark * 0.24 - light * 0.05
  const width = delta.width + light * 0.08
  const distance = delta.distance + dark * 0.4 - light * 0.1
  const texture = delta.texture
  const tone = delta.tone + bright * 0.3
  const depth = clamp(delta.space * 0.7 + delta.distance * 0.35 + dark * 0.5 - light * 0.42 - Math.max(0, delta.low) * 0.15, -1, 1)
  const detail = clamp01(0.18 + light * 0.66 + Math.max(0, presence) * 0.16 + Math.max(0, air) * 0.12)
  return {
    hue: h,
    light: y,
    bright,
    low,
    body,
    presence,
    air,
    saturation,
    space,
    width,
    distance,
    texture,
    tone,
    depth,
    detail,
  }
}

/** Continuous timbre at a pad position. Zero at the neutral center. */
export function colorTimbre(color: ColorSound): ColorTimbre {
  const c = clampColorSound(color)
  const macro = mapColorToSound(c.x, c.y)
  const dark = Math.max(0, -macro.bright)
  return {
    bright: macro.bright,
    low: macro.low * 6.6,
    body: macro.body * 5.4,
    presence: macro.presence * 5.8,
    air: macro.air * 6.4,
    sat: Math.max(0, macro.saturation * 32),
    wet: Math.max(0, macro.space * 32),
    distance: Math.max(0, macro.distance * 36),
    width: Math.max(0, macro.width * 78),
    texture: Math.max(0, macro.texture * 8),
    highCut: macro.air * 0.2 + macro.bright * 0.16 - dark * 0.34,
    tone: macro.tone * 24,
    delay: Math.max(0, macro.space * 18),
    mod: Math.max(0, macro.texture * 36),
    stereo: macro.width * 42,
  }
}

/** How the pad should bias the depth field. Subtle; the base motion stays. */
export function colorDepthBias(color: ColorSound): { light: number; space: number } {
  const macro = mapColorToSound(clampColorSound(color).x, clampColorSound(color).y)
  return {
    light: macro.bright,
    space: clamp01(macro.depth * 0.5 + 0.5),
  }
}

export type Rgb = { r: number; g: number; b: number }

export type ColorVisual = {
  rgb: Rgb
  amount: number
  /** 0 dark, 1 light. */
  light: number
  /** −1 close, +1 deep. */
  depth: number
  detail: number
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 1) + 1) % 1
  const sat = clamp01(s)
  const light = clamp01(l)
  if (sat === 0) {
    const v = Math.round(light * 255)
    return { r: v, g: v, b: v }
  }
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat
  const p = 2 * light - q
  const channel = (t: number) => {
    let u = t
    if (u < 0) u += 1
    if (u > 1) u -= 1
    if (u < 1 / 6) return p + (q - p) * 6 * u
    if (u < 1 / 2) return q
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
    return p
  }
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255),
  }
}

/** Pad swatch and visualization accent. Top of the field is light. */
export function colorSoundRgb(color: ColorSound): Rgb {
  const c = clampColorSound(color)
  const lift = 0.05 + Math.pow(c.y, 0.82) * 0.9
  const sat = 0.55 + (1 - Math.abs(c.y - 0.52) * 1.15) * 0.38
  return hslToRgb(c.x, clamp(sat, 0.42, 0.96), lift)
}

/** Visual character of the pad for the sensory painter. */
export function colorVisual(color: ColorSound): ColorVisual {
  const c = clampColorSound(color)
  const macro = mapColorToSound(c.x, c.y)
  return {
    rgb: colorSoundRgb(c),
    amount: colorSoundAmount(c),
    light: c.y,
    depth: macro.depth,
    detail: macro.detail,
  }
}

/** Short glide so a fast swipe does not step the DSP. */
export function approachColorSound(current: ColorSound, target: ColorSound, dtMs: number): ColorSound {
  const from = clampColorSound(current)
  const to = clampColorSound(target)
  const dt = Math.max(0, dtMs)
  const k = 1 - Math.exp(-dt / 85)
  const next = {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
  }
  if (Math.hypot(to.x - next.x, to.y - next.y) < 0.0015) return to
  return next
}

function setParam(dsp: DspSnapshot, id: ParamId, value: number): void {
  dsp.params[id] = applyParamValue(value, PARAMS[id])
}

function quantizeGain(value: number): number {
  const capped = clamp(value, -SENSORY_SAFETY.eqGain, SENSORY_SAFETY.eqGain)
  return Math.round(capped * 10) / 10
}

const BAND_TYPES: readonly EqFilterType[] = ['lowshelf', 'peaking', 'peaking', 'highshelf']
const BAND_HZ = [140, 520, 2800, 9200] as const
const BAND_Q = [0.7, 0.9, 1, 0.7] as const
const BAND_PARAMS: readonly { freq: ParamId; gain: ParamId; q: ParamId }[] = [
  { freq: 'eq1Freq', gain: 'eq1Gain', q: 'eq1Q' },
  { freq: 'eq2Freq', gain: 'eq2Gain', q: 'eq2Q' },
  { freq: 'eq3Freq', gain: 'eq3Gain', q: 'eq3Q' },
  { freq: 'eq4Freq', gain: 'eq4Gain', q: 'eq4Q' },
]

function filterOwned(values: SensoryValues): boolean {
  return FILTER_AXES.some((id) => Math.abs(values[id] ?? 0) >= 0.04)
}

function fork(dsp: DspSnapshot): DspSnapshot {
  return {
    params: { ...dsp.params },
    eqBands: dsp.eqBands.map((band) => ({ ...band })),
    bypass: { ...dsp.bypass },
    fxLfos: dsp.fxLfos,
    reverbType: dsp.reverbType,
    distortionType: dsp.distortionType,
  }
}

function paintBand(band: EqBand, index: number, gain: number, texture: number): EqBand {
  const created = band.type === 'off'
  const type = created ? BAND_TYPES[index]! : band.type
  const qBoost = index === 2 ? texture * 0.35 : 0
  return {
    ...band,
    type,
    frequency: created ? BAND_HZ[index]! : band.frequency,
    gain: quantizeGain(band.gain + gain),
    q: created ? BAND_Q[index]! + qBoost : band.q,
    bypassed: false,
  }
}

function syncBandParams(dsp: DspSnapshot, index: number, band: EqBand): void {
  const ids = BAND_PARAMS[index]
  if (!ids) return
  setParam(dsp, ids.freq, band.frequency)
  setParam(dsp, ids.gain, band.gain)
  setParam(dsp, ids.q, band.q)
}

/**
 * Overlay a continuous color timbre on a sensory-mapped snapshot.
 * The neutral pad position returns the snapshot unchanged.
 * Effect types stay put so dragging does not rebuild the graph.
 * Modules the macro touches stay open across the field; amounts ramp through zero.
 */
export function applyColorSound(dsp: DspSnapshot, color: ColorSound, values: SensoryValues): DspSnapshot {
  if (colorSoundIsNeutral(color)) return dsp
  const tone = colorTimbre(color)
  const next = fork(dsp)
  const gains = [tone.low, tone.body, tone.presence + tone.texture * 0.35, tone.air]
  for (let i = 0; i < 4; i++) {
    const band = next.eqBands[i]
    const delta = gains[i] ?? 0
    if (!band || Math.abs(delta) < 0.05) continue
    const painted = paintBand(band, i, delta, tone.texture)
    next.eqBands[i] = painted
    syncBandParams(next, i, painted)
  }
  next.bypass.eq = false

  setParam(next, 'saturation', Math.min(SENSORY_SAFETY.saturation, next.params.saturation + tone.sat))
  if (Math.abs(tone.tone) > 0.35) {
    setParam(next, 'distortionTone', clamp(next.params.distortionTone + tone.tone, 0, 100))
  }
  next.bypass.distortion = false

  const wet = Math.min(SENSORY_SAFETY.reverbWet, Math.max(1.2, next.params.reverbWet + tone.wet))
  setParam(next, 'reverbWet', wet)
  setParam(next, 'reverbDry', complementaryPct(next.params.reverbWet))
  if (tone.distance > 0.3) setParam(next, 'reverbDistance', clamp(next.params.reverbDistance + tone.distance, 0, 100))
  if (tone.width > 0.3) setParam(next, 'reverbWidth', clamp(next.params.reverbWidth + tone.width, 0, 200))
  if (Math.abs(tone.highCut) > 0.02) {
    setParam(next, 'reverbHighCut', clamp(next.params.reverbHighCut * (1 + tone.highCut), 1000, 20000))
  }
  if (tone.bright < -0.08) {
    setParam(next, 'reverbDamping', clamp(next.params.reverbDamping * (1 + tone.bright * 0.55), 200, 18000))
    setParam(next, 'reverbSize', clamp(next.params.reverbSize + tone.distance * 0.22, 0, 100))
  } else if (tone.bright > 0.08) {
    setParam(next, 'reverbSize', clamp(next.params.reverbSize - tone.bright * 6, 0, 100))
  }
  next.bypass.reverb = false

  const delayWet = Math.min(SENSORY_SAFETY.delayWet, next.params.delayWet + tone.delay)
  setParam(next, 'delayWet', delayWet)
  setParam(next, 'delayDry', complementaryPct(next.params.delayWet))
  if (tone.mod > 0.4) {
    setParam(next, 'delayModDepth', Math.min(SENSORY_SAFETY.delayModDepth, next.params.delayModDepth + tone.mod * 0.55))
  }
  next.bypass.delay = false

  setParam(next, 'msWidth', clamp(next.params.msWidth + tone.stereo, 48, 172))
  next.bypass.midside = false

  const dark = clamp01(-tone.bright)
  if (filterOwned(values)) {
    if (Math.abs(tone.bright) > 0.02) {
      const ratio = 2 ** (tone.bright * 0.9)
      setParam(next, 'filterCutoff', clamp(next.params.filterCutoff * ratio, 80, 18000))
    }
    if (tone.mod > 0.8) setParam(next, 'filterLfoDepth', clamp(next.params.filterLfoDepth + tone.mod * 0.45, 0, 40))
    if (dark > 0.08) {
      setParam(next, 'filterReso', Math.min(SENSORY_SAFETY.filterReso, next.params.filterReso + dark * 0.65))
    }
  } else if (dark > 0.045 || tone.mod > 8) {
    const mix = Math.max(dark * 84, Math.min(26, tone.mod * 0.7))
    const open = 1 - dark
    const cutoff = 860 * (14800 / 860) ** open
    setParam(next, 'filterKind', 0)
    setParam(next, 'filterMix', mix)
    setParam(next, 'filterCutoff', cutoff)
    setParam(next, 'filterReso', Math.min(SENSORY_SAFETY.filterReso, 0.62 + dark * 0.85))
    if (tone.mod > 0.8) {
      setParam(next, 'filterLfoDepth', Math.min(34, tone.mod))
      setParam(next, 'filterLfoRate', clamp(0.22 + tone.mod * 0.012, 0.08, 2.4))
    }
    next.bypass.filter = false
  }

  if (next.bypass.grain === false && tone.texture > 0.4) {
    setParam(next, 'density', clamp(next.params.density + tone.texture * 0.55, 1, 80))
    setParam(next, 'pitchSpread', Math.min(SENSORY_SAFETY.pitchSpread, next.params.pitchSpread + tone.texture * 0.28))
  }

  return next
}
