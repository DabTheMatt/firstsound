import type { StretchAlgo } from '../parameters/types'
import { clamp } from '../parameters/mapping'

export type StretchWindow = {
  grainSec: number
  hopSec: number
  peak: number
}

export function stretchAlgoFromParam(value: number): StretchAlgo {
  if (value < 0.5) return 'hann'
  if (value < 1.5) return 'triangle'
  return 'blackman'
}

/** Smooth (grain length) + density (hop overlap). Defaults match the old combined knob. */
export function stretchWindow(interp: number, density = interp): StretchWindow {
  const n = clamp(interp / 100, 0, 1)
  const d = clamp(density / 100, 0, 1)
  const grainSec = 0.112 - n * 0.058
  const hopRatio = 0.44 - d * 0.32
  const hopSec = Math.max(0.004, grainSec * hopRatio)
  const peak = clamp((hopSec / grainSec) * 1.08, 0.14, 0.62)
  return { grainSec, hopSec, peak }
}

/** One-pole mix so hop-sized updates share a stable time constant. */
export function stretchSlew(hopSec: number, interp: number): number {
  const n = clamp(interp / 100, 0, 1)
  const tau = 0.022 + n * 0.16
  return 1 - Math.exp(-Math.max(hopSec, 0.001) / tau)
}

export function smoothTowardLog(current: number, target: number, amount: number): number {
  const c = Math.max(1e-6, current)
  const t = Math.max(1e-6, target)
  const a = clamp(amount, 0, 1)
  return Math.exp(Math.log(c) + (Math.log(t) - Math.log(c)) * a)
}

export function smoothTowardLinear(current: number, target: number, amount: number): number {
  const a = clamp(amount, 0, 1)
  return current + (target - current) * a
}

export function hannCurve(length = 64): Float32Array {
  return windowCurve('hann', length)
}

export function windowCurve(algo: StretchAlgo, length = 64): Float32Array {
  const n = Math.max(8, Math.floor(length))
  const out = new Float32Array(n)
  const den = n - 1
  for (let i = 0; i < n; i++) {
    const x = i / den
    if (algo === 'triangle') {
      out[i] = 1 - Math.abs(2 * x - 1)
    } else if (algo === 'blackman') {
      out[i] =
        0.42 - 0.5 * Math.cos(2 * Math.PI * x) + 0.08 * Math.cos(4 * Math.PI * x)
    } else {
      out[i] = 0.5 * (1 - Math.cos(2 * Math.PI * x))
    }
  }
  return out
}

export function scaledHannCurve(peak: number, length = 64): Float32Array {
  return scaledWindowCurve('hann', peak, length)
}

export function scaledWindowCurve(algo: StretchAlgo, peak: number, length = 64): Float32Array {
  const curve = windowCurve(algo, length)
  const g = Math.max(0, peak)
  for (let i = 0; i < curve.length; i++) curve[i]! *= g
  return curve
}

export function stretchLookahead(hopSec: number): number {
  return Math.max(0.028, hopSec * 2.4)
}
