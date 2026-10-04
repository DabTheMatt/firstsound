/**
 * Static wet-path calibration. FIELD generates its own impulses and scales
 * them in `scaleReverbImpulse` (early-window RMS and a peak cap).
 * `ConvolverNode.normalize` stays false — Chrome's normalizer is far too quiet.
 *
 * This trim is unity. A second constant attenuation on top of that IR scale
 * made the wet path quieter than the mix law. `reverbDecayStackTrim` still
 * lowers long decays so overlapping grains do not climb. It is a function of
 * the decay parameter, not a live loudness follower.
 */
export const REVERB_WET_TRIM = 1

/** Long decays keep overlapping grains in the IR; keep the wet send quieter. */
export function reverbDecayStackTrim(decaySec: number): number {
  return 1 / Math.sqrt(1 + Math.max(0, decaySec - 1.2) * 0.22)
}

export function reverbWetOutputGain(outputPct: number, decaySec = 1.6): number {
  const trim = REVERB_WET_TRIM * reverbDecayStackTrim(decaySec)
  return Math.min(2, Math.max(0, outputPct / 100)) * trim
}

/**
 * Safety on the dry+wet sum. Identity through the range a full-scale dry path
 * already uses, then a soft knee, then a hard stop just under 0 dBFS.
 * Samples past ±1 use the curve ends, so a coherent equal-power sum cannot
 * light the clip indicators. This is not a loudness control.
 */
export const REVERB_SUM_CEILING = 0.97

export function makeReverbSumCeiling(n = 2048): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const knee = 0.9
  const ceil = REVERB_SUM_CEILING
  const last = n - 1
  for (let i = 0; i < n; i++) {
    const x = (i / last) * 2 - 1
    const mag = Math.abs(x)
    const sign = x < 0 ? -1 : 1
    if (mag <= knee) curve[i] = x
    else {
      const u = (mag - knee) / (1 - knee)
      const soft = knee + (ceil - knee) * Math.tanh(u * 1.4)
      curve[i] = sign * Math.min(ceil, soft)
    }
  }
  curve[0] = -ceil
  curve[last] = ceil
  return curve
}
