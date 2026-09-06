/** Extra wet-path trim so equal-power Mix cannot stack a hot IR on dry. */
export const REVERB_WET_TRIM = 0.62

/** Long decays keep overlapping grains in the IR; keep the wet send quieter. */
export function reverbDecayStackTrim(decaySec: number): number {
  return 1 / Math.sqrt(1 + Math.max(0, decaySec - 1.2) * 0.22)
}

export function reverbWetOutputGain(outputPct: number, decaySec = 1.6): number {
  const trim = REVERB_WET_TRIM * reverbDecayStackTrim(decaySec)
  return Math.min(2, Math.max(0, outputPct / 100)) * trim
}
