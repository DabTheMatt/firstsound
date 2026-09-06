import { PARAMS } from '../../audio/parameters/definitions'
import { applyParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { interpolateMorphStop, MORPH_GATE } from './morph'
import { EFFECT_MORPHS } from './effectMorphs'
import type { DspSnapshot } from './mappingEngine'
import type { SensoryValues } from '../sensoryState'

/**
 * Last-write morphs share one delay and one reverb. Echo then drift used to
 * leave Time L at the echo (hundreds of ms) and Time R at Haas (tens of ms)
 * with echo feedback still at 60% — a comb that howls into the cathedral.
 * Stacking keeps one musical delay and ducks wet/shimmer/grain when they pile on.
 */

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function setParam(dsp: DspSnapshot, id: ParamId, value: number): void {
  dsp.params[id] = applyParamValue(value, PARAMS[id])
}

function scaleParam(dsp: DspSnapshot, id: ParamId, factor: number): void {
  setParam(dsp, id, dsp.params[id] * Math.min(1, Math.max(0, factor)))
}

export function driftHaasMs(drift: number): number {
  return 8 + 26 * clamp01(drift)
}

export function stackingEnergy(values: SensoryValues): number {
  return (
    clamp01(values.space) +
    clamp01(values.echo) +
    clamp01(values.grain) * 0.7 +
    clamp01(values.dirt) * 0.8 +
    clamp01(values.drift) * 0.45 +
    clamp01(values.mod) * 0.25 +
    clamp01(values.veil) * 0.7 +
    clamp01(values.halo) * 0.65 +
    clamp01(values.well) * 0.55 +
    Math.abs(values.character) * 0.3
  )
}

function echoTimeMs(echo: number): number {
  const morph = EFFECT_MORPHS.find((m) => m.axis === 'echo')
  if (!morph) return 300
  return interpolateMorphStop(morph.stops, echo).params?.delayTime ?? 300
}

function echoFeedback(echo: number): number {
  const morph = EFFECT_MORPHS.find((m) => m.axis === 'echo')
  if (!morph) return 28
  return interpolateMorphStop(morph.stops, echo).params?.delayFeedback ?? 28
}

function echoWet(echo: number): number {
  const morph = EFFECT_MORPHS.find((m) => m.axis === 'echo')
  if (!morph) return 0
  return interpolateMorphStop(morph.stops, echo).params?.delayWet ?? 0
}

/** Merge shared delay/reverb/grain energy so overlapping feelings stay musical. */
export function applySensoryStacking(dsp: DspSnapshot, values: SensoryValues): void {
  const space = clamp01(values.space)
  const echo = clamp01(values.echo)
  const drift = clamp01(values.drift)
  const grain = clamp01(values.grain)
  const dirt = clamp01(values.dirt)
  const tight = clamp01(values.tight)
  const mod = clamp01(values.mod)
  const veil = clamp01(values.veil)
  const halo = clamp01(values.halo)
  const well = clamp01(values.well)

  if (echo >= MORPH_GATE && drift >= MORPH_GATE) {
    const timeL = echoTimeMs(echo)
    setParam(dsp, 'delayTime', timeL)
    setParam(dsp, 'delayTimeR', timeL + driftHaasMs(drift))
    setParam(dsp, 'delayStereo', 1)
    setParam(dsp, 'delayWet', echoWet(echo))
    setParam(dsp, 'delayFeedback', echoFeedback(echo) * (1 - 0.32 * drift))
    setParam(dsp, 'delayOffset', Math.min(dsp.params.delayOffset, 16 + 10 * drift))
  }

  const air = Math.min(1, space * echo + 0.55 * space * (veil + halo) + 0.4 * echo * (veil + well))
  if (air > 0.02) {
    scaleParam(dsp, 'reverbWet', 1 - 0.4 * air)
    scaleParam(dsp, 'delayWet', 1 - 0.2 * air)
    scaleParam(dsp, 'reverbShimmer', 1 - 0.62 * air)
    scaleParam(dsp, 'reverbDecay', 1 - 0.24 * air)
    scaleParam(dsp, 'delayFeedback', 1 - 0.22 * air)
  }

  if (echo >= MORPH_GATE && veil + halo + well > 0.04) {
    setParam(dsp, 'delayTime', echoTimeMs(echo))
    scaleParam(dsp, 'delayWet', 1 - 0.18 * Math.min(1, veil + halo * 0.6 + well * 0.5))
  }

  const grainIntoAir = Math.min(1, grain * Math.max(space, echo, drift * 0.6))
  if (grainIntoAir > 0.02) {
    scaleParam(dsp, 'density', 1 - 0.34 * grainIntoAir)
    scaleParam(dsp, 'pitchSpread', 1 - 0.45 * grainIntoAir)
    scaleParam(dsp, 'scatter', 1 - 0.22 * grainIntoAir)
  }

  const grainMotion = Math.min(1, grain * mod)
  if (grainMotion > 0.02) {
    scaleParam(dsp, 'density', 1 - 0.18 * grainMotion)
  }

  const dirtIntoAir = Math.min(1, dirt * (0.55 * space + 0.45 * echo + 0.35 * grain))
  if (dirtIntoAir > 0.02) {
    scaleParam(dsp, 'saturation', 1 - 0.3 * dirtIntoAir)
  }

  if (tight >= MORPH_GATE && space + echo + grain + dirt > 0.45) {
    scaleParam(dsp, 'compressorMakeup', 0.32)
  }

  const energy = stackingEnergy(values)
  const pile =
    energy > 0.85 ||
    (space > 0.38 && echo > 0.32) ||
    (echo > 0.28 && drift > 0.28) ||
    (grain > 0.45 && (space > 0.35 || echo > 0.35)) ||
    veil + halo + well > 0.7
  if (pile) dsp.bypass.limiter = false
}
