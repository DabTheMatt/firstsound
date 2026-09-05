/**
 * The convolver already carries the room. Feeding the tank back into it is what
 * howls into the speakers. Keep tank at zero unless freeze; shimmer is
 * feed-forward into the wet pan only.
 */
export const REVERB_LOOP_HEADROOM = 0.5

export function reverbLoopGains(opts: {
  decaySec: number
  sizePct: number
  shimmer01: number
  huge: boolean
  freeze: boolean
}): { tank: number; shimmer: number } {
  const shimmerWant = Math.min(0.12, Math.max(0, opts.shimmer01) * 0.18)
  if (opts.freeze) {
    const tank = 0.42
    return { tank, shimmer: Math.min(shimmerWant, 0.08) }
  }
  void opts.decaySec
  void opts.sizePct
  void opts.huge
  return { tank: 0, shimmer: shimmerWant }
}

export function reverbLoopEnergy(opts: {
  decaySec: number
  sizePct: number
  shimmer01: number
  huge: boolean
  freeze: boolean
}): number {
  const g = reverbLoopGains(opts)
  return g.tank + g.shimmer
}
