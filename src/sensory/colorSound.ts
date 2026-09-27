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
  /** Multiplier delta on the reverb high cut. */
  highCut: number
  tone: number
}

const ZERO_TONE: HueTone = {
  low: 0,
  body: 0,
  presence: 0,
  air: 0,
  sat: 0,
  wet: 0,
  distance: 0,
  width: 0,
  texture: 0,
  highCut: 0,
  tone: 0,
}

/** Absolute region colors. Cyan is the zero so the pad center stays at DSP defaults. */
const HUE_ANCHORS: readonly { h: number; v: HueTone }[] = [
  { h: 0, v: { low: 3.4, body: 1.6, presence: -0.4, air: -1, sat: 18, wet: 0, distance: 0, width: 0, texture: 1.8, highCut: -0.22, tone: -12 } },
  { h: 0.08, v: { low: 2.4, body: 1.8, presence: 0.5, air: -0.15, sat: 12, wet: 0, distance: 0, width: 0, texture: 0.5, highCut: -0.08, tone: -6 } },
  { h: 0.17, v: { low: 0.2, body: -1.1, presence: 3.1, air: 1.8, sat: 3, wet: 0, distance: 0, width: 6, texture: 0, highCut: 0.04, tone: 8 } },
  { h: 0.33, v: { low: -0.6, body: -1.5, presence: 2.4, air: 2.2, sat: 0, wet: 5, distance: 5, width: 14, texture: 0, highCut: 0.12, tone: 10 } },
  { h: 0.5, v: ZERO_TONE },
  { h: 0.66, v: { low: -1.5, body: -0.2, presence: 0.5, air: 0.9, sat: 0, wet: 16, distance: 18, width: 36, texture: 0, highCut: 0.26, tone: 4 } },
  { h: 0.83, v: { low: 0.8, body: 1.1, presence: 0.7, air: 0.15, sat: 10, wet: 7, distance: 7, width: 16, texture: 3.2, highCut: 0, tone: -4 } },
]

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

function lobe(hue: number, center: number, width = 0.36): number {
  const d = circularDistance(hue, center)
  if (d >= width) return 0
  return 0.5 * (1 + Math.cos(Math.PI * (d / width)))
}

function sampleHue(hue: number): HueTone {
  let weight = 0
  const acc: HueTone = { ...ZERO_TONE }
  for (const anchor of HUE_ANCHORS) {
    const w = lobe(hue, anchor.h)
    if (w <= 0) continue
    weight += w
    acc.low += anchor.v.low * w
    acc.body += anchor.v.body * w
    acc.presence += anchor.v.presence * w
    acc.air += anchor.v.air * w
    acc.sat += anchor.v.sat * w
    acc.wet += anchor.v.wet * w
    acc.distance += anchor.v.distance * w
    acc.width += anchor.v.width * w
    acc.texture += anchor.v.texture * w
    acc.highCut += anchor.v.highCut * w
    acc.tone += anchor.v.tone * w
  }
  if (weight <= 1e-6) return { ...ZERO_TONE }
  const scale = 1 / weight
  return {
    low: acc.low * scale,
    body: acc.body * scale,
    presence: acc.presence * scale,
    air: acc.air * scale,
    sat: acc.sat * scale,
    wet: acc.wet * scale,
    distance: acc.distance * scale,
    width: acc.width * scale,
    texture: acc.texture * scale,
    highCut: acc.highCut * scale,
    tone: acc.tone * scale,
  }
}

let neutralHue: HueTone | null = null

function hueDelta(hue: number): HueTone {
  neutralHue ??= sampleHue(NEUTRAL_COLOR_SOUND.x)
  const raw = sampleHue(hue)
  return {
    low: raw.low - neutralHue.low,
    body: raw.body - neutralHue.body,
    presence: raw.presence - neutralHue.presence,
    air: raw.air - neutralHue.air,
    sat: raw.sat - neutralHue.sat,
    wet: raw.wet - neutralHue.wet,
    distance: raw.distance - neutralHue.distance,
    width: raw.width - neutralHue.width,
    texture: raw.texture - neutralHue.texture,
    highCut: raw.highCut - neutralHue.highCut,
    tone: raw.tone - neutralHue.tone,
  }
}

/** Continuous timbre at a pad position. Zero at the neutral center. */
export function colorTimbre(color: ColorSound): ColorTimbre {
  const c = clampColorSound(color)
  const hue = hueDelta(c.x)
  const bright = (c.y - 0.5) * 2
  const dark = Math.max(0, -bright)
  const light = Math.max(0, bright)
  return {
    bright,
    low: hue.low + bright * (bright < 0 ? 2.1 : 0.35),
    body: hue.body,
    presence: hue.presence + light * 1.45,
    air: hue.air + bright * 5,
    sat: Math.max(0, hue.sat),
    wet: Math.max(0, hue.wet + dark * 8),
    distance: Math.max(0, hue.distance + dark * 16),
    width: Math.max(0, hue.width),
    texture: Math.max(0, hue.texture),
    highCut: hue.highCut - dark * 0.35 + light * 0.12,
    tone: hue.tone + bright * 16,
  }
}

export type Rgb = { r: number; g: number; b: number }

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
  const lift = 0.14 + c.y * 0.66
  const sat = 0.62 + (1 - Math.abs(c.y - 0.55) * 1.2) * 0.22
  return hslToRgb(c.x, clamp(sat, 0.4, 0.92), lift)
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
 * Discrete effect types are left alone so the graph is not rebuilt while dragging.
 */
export function applyColorSound(dsp: DspSnapshot, color: ColorSound, values: SensoryValues): DspSnapshot {
  if (colorSoundIsNeutral(color)) return dsp
  const tone = colorTimbre(color)
  const next = fork(dsp)
  const gains = [tone.low, tone.body, tone.presence + tone.texture * 0.45, tone.air]
  let eqTouched = false
  for (let i = 0; i < 4; i++) {
    const band = next.eqBands[i]
    const delta = gains[i] ?? 0
    if (!band || Math.abs(delta) < 0.08) continue
    const painted = paintBand(band, i, delta, tone.texture)
    next.eqBands[i] = painted
    syncBandParams(next, i, painted)
    eqTouched = true
  }
  if (eqTouched) next.bypass.eq = false

  if (tone.sat >= 0.45) {
    setParam(next, 'saturation', Math.min(SENSORY_SAFETY.saturation, next.params.saturation + tone.sat))
    next.bypass.distortion = false
  }
  const distortionLive = next.bypass.distortion === false || next.params.saturation > 0.4
  if (distortionLive && Math.abs(tone.tone) > 0.4) {
    setParam(next, 'distortionTone', clamp(next.params.distortionTone + tone.tone, 0, 100))
  }

  const reverbLive = next.bypass.reverb === false || tone.wet >= 0.6
  if (reverbLive && (tone.wet >= 0.6 || Math.abs(tone.highCut) > 0.02 || tone.distance > 0.4)) {
    if (tone.wet >= 0.35) {
      setParam(next, 'reverbWet', Math.min(SENSORY_SAFETY.reverbWet, next.params.reverbWet + tone.wet))
      setParam(next, 'reverbDry', complementaryPct(next.params.reverbWet))
    }
    if (tone.distance > 0.4) setParam(next, 'reverbDistance', clamp(next.params.reverbDistance + tone.distance, 0, 100))
    if (tone.width > 0.4) setParam(next, 'reverbWidth', clamp(next.params.reverbWidth + tone.width, 0, 200))
    if (Math.abs(tone.highCut) > 0.02) {
      setParam(next, 'reverbHighCut', clamp(next.params.reverbHighCut * (1 + tone.highCut), 1000, 20000))
    }
    if (tone.bright < -0.08) {
      setParam(next, 'reverbDamping', clamp(next.params.reverbDamping * (1 + tone.bright * 0.45), 200, 18000))
    }
    if (next.params.reverbWet > 0.5) next.bypass.reverb = false
  }

  if (filterOwned(values)) {
    if (Math.abs(tone.bright) > 0.02) {
      const ratio = 2 ** (tone.bright * 0.65)
      setParam(next, 'filterCutoff', clamp(next.params.filterCutoff * ratio, 80, 18000))
    }
  } else if (tone.bright < -0.04) {
    const dark = clamp(-tone.bright, 0, 1)
    setParam(next, 'filterKind', 0)
    setParam(next, 'filterMix', dark * 76)
    setParam(next, 'filterCutoff', 700 * (14000 / 700) ** (1 - dark))
    setParam(next, 'filterReso', Math.min(SENSORY_SAFETY.filterReso, 0.7 + dark * 0.35))
    next.bypass.filter = false
  }

  return next
}
