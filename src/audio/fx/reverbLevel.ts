/** Wet-path gain follows Output. Clip protection lives on the wet limiter, not a second trim. */
export const REVERB_WET_TRIM = 1

export function reverbWetOutputGain(outputPct: number): number {
  return Math.min(2, Math.max(0, outputPct / 100)) * REVERB_WET_TRIM
}
