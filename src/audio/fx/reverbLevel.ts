/** Extra wet-path trim so equal-power Mix cannot stack a hot IR on dry. */
export const REVERB_WET_TRIM = 0.62

export function reverbWetOutputGain(outputPct: number): number {
  return Math.min(2, Math.max(0, outputPct / 100)) * REVERB_WET_TRIM
}
