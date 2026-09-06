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

/** Decimal places implied by a step so 0.1 * 28 does not become 2.8000000000000003. */
export function stepDecimals(step: number): number {
  if (!(step > 0) || step >= 1) return 0
  const text = step.toString()
  const exp = /e-(\d+)$/i.exec(text)
  if (exp) return Math.min(8, Number(exp[1]))
  const frac = text.split('.')[1]
  return frac ? Math.min(8, frac.length) : 1
}

export function quantize(value: number, def: ParamDef): number {
  if (def.step == null) return value
  const snapped = Math.round(value / def.step) * def.step
  const rounded = Number(snapped.toFixed(stepDecimals(def.step)))
  return clamp(rounded, def.min, def.max)
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

/** Stop parks the playhead at the loop / selection, not the file origin. */
export function parkPlayheadOnStop(start: number, end: number, reverse: boolean): number {
  return reverse ? end : start
}

/** Play starts inside the region so the transport clock matches the voice. */
export function snapPlayheadToRegion(
  time: number,
  start: number,
  end: number,
  reverse: boolean,
): number {
  if (time < start || time > end) return reverse ? end : start
  return time
}

/** Inset region so start/end handles are visible, like the FIELD mockup. */
export function defaultPlayRegion(
  duration: number,
  minLen = 0.05,
): { start: number; end: number } {
  if (duration <= 0) return { start: 0, end: 0 }
  return clampRegion(duration * 0.18, duration * 0.65, duration, minLen)
}

/** Play the entire buffer — used after Trim / Use as Sample bake. */
export function fullPlayRegion(duration: number): { start: number; end: number } {
  if (duration <= 0) return { start: 0, end: 0 }
  return { start: 0, end: duration }
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20)
}

/** Transpose ratio. 12 st → 2×, independent of playback speed. */
export function pitchRatio(semitones: number): number {
  return 2 ** (semitones / 12)
}

/** True when BufferSource tape-rate would couple speed and pitch. */
export function playbackNeedsStretch(speed: number, pitchSemitones: number): boolean {
  return Math.abs(speed - 1) > 0.01 || Math.abs(pitchSemitones) > 0.05
}

/** Legacy tape rate (speed × transpose). Playback/grain now keep them separate. */
export function playbackRate(speed: number, pitchSemitones: number): number {
  return speed * pitchRatio(pitchSemitones)
}

/** Parse a typed knob readout (`2k`, `12 dB`, `80ms`) into a parameter value. */
export function parseTypedNumber(raw: string): { value: number; suffix: string } | null {
  const s = raw.trim().toLowerCase().replace(',', '.')
  const m = s.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/)
  if (!m || m.index == null) return null
  const value = Number(m[0])
  if (!Number.isFinite(value)) return null
  return { value, suffix: s.slice(m.index + m[0].length).replace(/\s+/g, '') }
}

export function parseTypedParam(raw: string, def: ParamDef): number | null {
  const parsed = parseTypedNumber(raw)
  if (!parsed) return null
  let v = parsed.value
  const suf = parsed.suffix
  if (def.unit === 'Hz' && (suf.startsWith('k') || suf === 'khz')) v *= 1000
  else if (def.unit === 'ms' && (suf === 's' || suf === 'sec')) v *= 1000
  else if (def.unit === 's' && suf === 'ms') v /= 1000
  return applyParamValue(v, def)
}

export function parseTypedRange(raw: string, min: number, max: number, unit = ''): number | null {
  const parsed = parseTypedNumber(raw)
  if (!parsed) return null
  let v = parsed.value
  const suf = parsed.suffix
  if (unit === 'Hz' && (suf.startsWith('k') || suf === 'khz')) v *= 1000
  else if (unit === 'ms' && (suf === 's' || suf === 'sec')) v *= 1000
  else if (unit === 's' && suf === 'ms') v /= 1000
  else if (unit === 'ms' && suf === '') {
    /* typed value is already in display milliseconds */
  }
  return clamp(v, min, max)
}

export function formatParamValue(value: number, def: ParamDef): string {
  switch (def.id) {
    case 'speed':
      return `${value.toFixed(2)}x`
    case 'pitch':
    case 'grainPitch':
    case 'pitchSpread':
    case 'delayPitch':
    case 'reverbShimmerPitch':
      return `${value.toFixed(2)} st`
    case 'gain':
    case 'outputGain':
    case 'channelGainL':
    case 'channelGainR':
    case 'reverbGateThres':
    case 'reverbLimit':
    case 'limiterThreshold':
    case 'limiterCeiling':
    case 'limiterKnee':
    case 'limiterMakeup':
    case 'limiterInput':
    case 'compressorThreshold':
    case 'compressorKnee':
    case 'compressorMakeup':
    case 'compressorInput':
      return `${value.toFixed(1)} dB`
    case 'grainSize':
      return `${Math.round(value)} ms`
    case 'density':
      return `${value.toFixed(1)} Hz`
    case 'delayTime':
    case 'delayTimeR':
    case 'reverbPredelay':
    case 'reverbGateAttack':
    case 'reverbGateHold':
    case 'reverbGateRelease':
    case 'limiterRelease':
    case 'limiterAttack':
    case 'compressorRelease':
    case 'compressorAttack':
    case 'filterEnvAttack':
    case 'filterEnvRelease':
    case 'filterAdsAttack':
    case 'filterAdsDecay':
    case 'filterAdsRelease':
      return value < 10 ? `${value.toFixed(1)} ms` : `${Math.round(value)} ms`
    case 'reverbDecay':
      return value < 10 ? `${value.toFixed(2)} s` : `${value.toFixed(1)} s`
    case 'bpm':
      return `${value.toFixed(1)} BPM`
    case 'motionRate':
    case 'delayModRate':
    case 'reverbModRate':
    case 'filterLfoRate':
      return `${value.toFixed(2)} Hz`
    case 'filterCutoff':
    case 'reverbDamping':
    case 'delayHp':
    case 'delayLp':
    case 'reverbLowCut':
    case 'reverbHighCut':
    case 'msMidLowFreq':
    case 'msMidPeakFreq':
    case 'msMidHighFreq':
    case 'msSideLowFreq':
    case 'msSidePeakFreq':
    case 'msSideHighFreq':
      return value >= 1000
        ? `${(value / 1000).toFixed(2)} kHz`
        : `${Math.round(value)} Hz`
    case 'filterReso':
      return `${value.toFixed(2)} Q`
    case 'filterLfoSync':
    case 'filterEnvDir':
    case 'delaySync':
    case 'delaySyncR':
    case 'delayStereo':
    case 'reverbStereo':
    case 'reverbSync':
    case 'delayFreeze':
    case 'reverbFreeze':
    case 'delayCorrelate':
    case 'reverbCorrelate':
    case 'makeMono':
    case 'invertPhase':
    case 'limiterAutoMakeup':
    case 'compressorAutoMakeup':
    case 'msSoloMid':
    case 'msSoloSide':
    case 'msMono':
    case 'msFlipMid':
    case 'msFlipSide':
      return value > 0.5 ? 'On' : 'Off'
    case 'msHaasDir':
      return value < 0.5 ? 'L' : 'R'
    case 'msSideHpf':
      return value < 20
        ? 'Off'
        : value >= 1000
          ? '1.00 kHz'
          : `${Math.round(value)} Hz`
    case 'msMidGain':
    case 'msSideGain':
      return value <= def.min + 0.05 ? '−∞ dB' : `${value.toFixed(1)} dB`
    case 'msMidLowGain':
    case 'msMidPeakGain':
    case 'msMidHighGain':
    case 'msSideLowGain':
    case 'msSidePeakGain':
    case 'msSideHighGain':
      return `${value.toFixed(1)} dB`
    case 'msBalance':
      if (Math.abs(value) < 0.5) return 'Center'
      return value < 0 ? `Mid ${Math.round(-value)}` : `Side ${Math.round(value)}`
    case 'msRotate':
      if (Math.abs(value) < 0.5) return '0'
      return value < 0 ? `L ${Math.round(-value)}` : `R ${Math.round(value)}`
    case 'msMidTilt':
    case 'msSideTilt':
      if (Math.abs(value) < 0.5) return '0'
      return value < 0 ? `Dark ${Math.round(-value)}` : `Bright ${Math.round(value)}`
    case 'pan':
    case 'reverbPan':
      if (Math.abs(value) < 0.5) return 'C'
      return value < 0 ? `L ${Math.round(-value)}` : `R ${Math.round(value)}`
    default: {
      if (def.unit === '%') return `${Math.round(value)} %`
      if (def.unit === 'ms') return `${Math.round(value)} ms`
      if (def.unit === 'Hz') return `${value.toFixed(2)} Hz`
      if (def.unit === ':1') return `${value.toFixed(1)}:1`
      if (def.unit === 'dB') return `${value.toFixed(1)} dB`
      const digits = def.step != null ? stepDecimals(def.step) : 2
      const body = Number.isFinite(value) ? value.toFixed(digits) : String(value)
      return def.unit ? `${body} ${def.unit}` : body
    }
  }
}
