/**
 * The tank still recirculates into the convolver. Shimmer is feed-forward into
 * the wet pan so it sparkles instead of regenerating as hiss. Keep tank well
 * below unity; shimmer is reported separately for mix level.
 */
export const REVERB_LOOP_HEADROOM = 0.62

export function reverbLoopGains(opts: {
  decaySec: number
  sizePct: number
  shimmer01: number
  huge: boolean
  freeze: boolean
}): { tank: number; shimmer: number } {
  const shimmerWant = Math.min(0.2, Math.max(0, opts.shimmer01) * 0.32)
  if (opts.freeze) {
    const tank = 0.66
    return { tank, shimmer: Math.min(shimmerWant, Math.max(0, 0.76 - tank)) }
  }
  const size = Math.min(1, Math.max(0, opts.sizePct / 100))
  const decay = Math.min(1, Math.max(0, opts.decaySec / 18))
  let tank = 0.05 + size * 0.15 + (opts.huge ? 0.035 : 0)
  tank *= 1 - decay * 0.5
  tank = Math.min(0.26, Math.max(0, tank))
  const sum = tank + shimmerWant
  const scale = sum > REVERB_LOOP_HEADROOM ? REVERB_LOOP_HEADROOM / sum : 1
  return { tank: tank * scale, shimmer: shimmerWant * scale }
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
