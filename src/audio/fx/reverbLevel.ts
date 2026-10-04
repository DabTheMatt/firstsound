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
