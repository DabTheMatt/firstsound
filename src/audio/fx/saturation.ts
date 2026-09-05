import { equalPowerDryWet } from './dryWet'

/** Waveshaper for the saturation module. Small-signal gain stays near unity. */
export function makeTanhCurve(amount01: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const drive = Math.min(1, Math.max(0, amount01))
  if (drive <= 0.001) {
    for (let i = 0; i < n; i++) curve[i] = (i / (n - 1)) * 2 - 1
    return curve
  }
  const k = 1 + drive * 10
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.tanh(k * x) / k
  }
  return curve
}

/** Drive off is fully dry. Mix is equal-power when the shaper is running. */
export function saturationDryWet(drivePct: number, mixPct: number): { dry: number; wet: number } {
  if (drivePct <= 0.05) return { dry: 1, wet: 0 }
  return equalPowerDryWet(mixPct / 100)
}
