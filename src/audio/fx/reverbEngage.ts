/** Mix used when the reverb module is switched on with Mix still at 0. */
export const REVERB_ENGAGE_MIX = 36

export function mixWhenEnablingReverb(currentWet: number): number {
  return currentWet < 1 ? REVERB_ENGAGE_MIX : currentWet
}

export function reverbMixEngagesModule(wet: number): boolean {
  return wet >= 1
}
