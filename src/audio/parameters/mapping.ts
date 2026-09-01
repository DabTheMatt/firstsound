import type { ParamDef, ScrubMode } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function toNormalized(value: number, def: ParamDef): number {
  const v = clamp(value, def.min, def.max)
  if (def.mapping === 'log') {
    const min = Math.max(def.min, Number.EPSILON)
    const max = Math.max(def.max, min * 1.000_001)
    const x = Math.max(v, min)
    return (Math.log(x) - Math.log(min)) / (Math.log(max) - Math.log(min))
  }
  if (def.max === def.min) return 0
  return (v - def.min) / (def.max - def.min)
}

export function fromNormalized(t: number, def: ParamDef): number {
  const n = clamp(t, 0, 1)
  if (def.mapping === 'log') {
    const min = Math.max(def.min, Number.EPSILON)
    const max = Math.max(def.max, min * 1.000_001)
    return min * (max / min) ** n
  }
  return def.min + n * (def.max - def.min)
}

export function quantize(value: number, def: ParamDef): number {
  if (def.step == null) return value
  const snapped = Math.round(value / def.step) * def.step
  return clamp(snapped, def.min, def.max)
}

export function applyParamValue(value: number, def: ParamDef): number {
  return quantize(clamp(value, def.min, def.max), def)
}

/** Loop region in seconds. `duration` is the sample length. */
export function clampRegion(
  start: number,
  end: number,
  duration: number,
  minLen = 0.05,
): { start: number; end: number } {
  if (duration <= 0) return { start: 0, end: 0 }
  const span = Math.min(minLen, duration)
  const s = clamp(start, 0, Math.max(0, duration - span))
  const e = clamp(end, s + span, duration)
  return { start: s, end: e }
}

export function scrubBounds(
  mode: ScrubMode,
  start: number,
  end: number,
  duration: number,
): { min: number; max: number } {
  if (duration <= 0) return { min: 0, max: 0 }
  if (mode === 'region') return { min: start, max: end }
  return { min: 0, max: duration }
}

export function clampScrubTime(
  time: number,
  mode: ScrubMode,
  start: number,
  end: number,
  duration: number,
): number {
  const { min, max } = scrubBounds(mode, start, end, duration)
  return clamp(time, min, max)
}

/** Inset region so start/end handles are visible, like the FIELD mockup. */
export function defaultPlayRegion(
  duration: number,
  minLen = 0.05,
): { start: number; end: number } {
  if (duration <= 0) return { start: 0, end: 0 }
  return clampRegion(duration * 0.18, duration * 0.65, duration, minLen)
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20)
}

export function playbackRate(speed: number, pitchSemitones: number): number {
  return speed * 2 ** (pitchSemitones / 12)
}

export function formatParamValue(value: number, def: ParamDef): string {
  switch (def.id) {
    case 'speed':
      return `${value.toFixed(2)}x`
    case 'pitch':
    case 'grainPitch':
    case 'pitchSpread':
      return `${value.toFixed(2)} st`
    case 'gain':
    case 'outputGain':
      return `${value.toFixed(1)} dB`
    case 'grainSize':
      return `${Math.round(value)} ms`
    case 'density':
      return `${value.toFixed(1)} Hz`
    case 'position':
    case 'scatter':
    case 'spaceMix':
    case 'delayFeedback':
    case 'reverb':
    case 'motionDepth':
    case 'motionJitter':
    case 'saturation':
    case 'reverbSize':
    case 'reverbDecay':
      return `${Math.round(value)} %`
    case 'delayTime':
    case 'reverbPredelay':
      return `${Math.round(value)} ms`
    case 'motionRate':
      return `${value.toFixed(2)} Hz`
    case 'filterCutoff':
    case 'reverbDamping':
      return value >= 1000
        ? `${(value / 1000).toFixed(2)} kHz`
        : `${Math.round(value)} Hz`
    case 'filterReso':
      return `${value.toFixed(2)} Q`
    default:
      return String(value)
  }
}
