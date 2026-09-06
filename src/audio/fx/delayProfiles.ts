import type { ParamId } from '../parameters/types'
import { DELAY_TYPES, type DelayType } from './types'

/**
 * Musical delay recipes (Ableton Simple Delay / EchoBoy / RE-201 / Memory Man).
 * Color knobs are applied when the user picks a type; loop caps keep the
 * recirculation dark and non-resonant so repeats fade instead of hissing up.
 */
export type DelayTypeProfile = {
  fbScale: number
  filterQ: number
  loopHpMin: number
  loopLpMax: number
  hp: number
  lp: number
  drive: number
  wow: number
  flutter: number
  drift: number
  diffusion: number
  pitch: number
  reverse: number
  modDepth: number
  modRate: number
}

export const DELAY_TYPE_PROFILES: Record<DelayType, DelayTypeProfile> = {
  digital: {
    fbScale: 0.85,
    filterQ: 0.5,
    loopHpMin: 30,
    loopLpMax: 10000,
    hp: 40,
    lp: 10000,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 0,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.4,
  },
  analog: {
    fbScale: 0.8,
    filterQ: 0.42,
    loopHpMin: 140,
    loopLpMax: 4200,
    hp: 160,
    lp: 4000,
    drive: 6,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 0,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.4,
  },
  tape: {
    fbScale: 0.78,
    filterQ: 0.42,
    loopHpMin: 90,
    loopLpMax: 5500,
    hp: 100,
    lp: 5200,
    drive: 10,
    wow: 14,
    flutter: 8,
    drift: 4,
    diffusion: 0,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.35,
  },
  pingPong: {
    fbScale: 0.84,
    filterQ: 0.5,
    loopHpMin: 40,
    loopLpMax: 9000,
    hp: 50,
    lp: 9000,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 0,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.4,
  },
  stereo: {
    fbScale: 0.84,
    filterQ: 0.5,
    loopHpMin: 30,
    loopLpMax: 10000,
    hp: 40,
    lp: 10000,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 0,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.4,
  },
  multiTap: {
    fbScale: 0.76,
    filterQ: 0.48,
    loopHpMin: 50,
    loopLpMax: 8000,
    hp: 60,
    lp: 8000,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 8,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.4,
  },
  reverse: {
    fbScale: 0.7,
    filterQ: 0.45,
    loopHpMin: 70,
    loopLpMax: 7000,
    hp: 80,
    lp: 7000,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 0,
    pitch: 0,
    reverse: 100,
    modDepth: 0,
    modRate: 0.4,
  },
  diffuse: {
    fbScale: 0.72,
    filterQ: 0.4,
    loopHpMin: 70,
    loopLpMax: 6500,
    hp: 80,
    lp: 6500,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 42,
    pitch: 0,
    reverse: 0,
    modDepth: 8,
    modRate: 0.25,
  },
  lofi: {
    fbScale: 0.76,
    filterQ: 0.4,
    loopHpMin: 220,
    loopLpMax: 2800,
    hp: 240,
    lp: 2600,
    drive: 16,
    wow: 6,
    flutter: 4,
    drift: 12,
    diffusion: 0,
    pitch: 0,
    reverse: 0,
    modDepth: 0,
    modRate: 0.3,
  },
  pitch: {
    fbScale: 0.72,
    filterQ: 0.48,
    loopHpMin: 50,
    loopLpMax: 8000,
    hp: 60,
    lp: 8000,
    drive: 0,
    wow: 0,
    flutter: 0,
    drift: 0,
    diffusion: 0,
    pitch: 7,
    reverse: 0,
    modDepth: 0,
    modRate: 0.4,
  },
}

export function delayTypeProfile(type: DelayType): DelayTypeProfile {
  return DELAY_TYPE_PROFILES[type]
}

/** Color / loop knobs for a type. Leaves Time, Feedback, Dry/Wet, Width alone. */
export function delayTypeColorPatch(type: DelayType): Partial<Record<ParamId, number>> {
  const p = delayTypeProfile(type)
  return {
    delayHp: p.hp,
    delayLp: p.lp,
    delayDrive: p.drive,
    delayWow: p.wow,
    delayFlutter: p.flutter,
    delayDrift: p.drift,
    delayDiffusion: p.diffusion,
    delayPitch: p.pitch,
    delayReverse: p.reverse,
    delayModDepth: p.modDepth,
    delayModRate: p.modRate,
  }
}

export function allDelayTypes(): DelayType[] {
  return DELAY_TYPES.map((t) => t.value)
}
