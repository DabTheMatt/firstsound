import { describe, expect, it } from 'vitest'
import { REVERB_LOOP_HEADROOM, reverbLoopEnergy, reverbLoopGains } from './reverbLoop'

describe('reverbLoopGains', () => {
  it('keeps tank+shimmer below unity so the convolver cannot howl', () => {
    const cases = [
      { decaySec: 18, sizePct: 100, shimmer01: 0.52, huge: true, freeze: false },
      { decaySec: 40, sizePct: 100, shimmer01: 0.8, huge: true, freeze: false },
      { decaySec: 1.6, sizePct: 50, shimmer01: 0, huge: false, freeze: false },
      { decaySec: 8, sizePct: 90, shimmer01: 1, huge: true, freeze: false },
      { decaySec: 14, sizePct: 96, shimmer01: 0.3, huge: true, freeze: true },
    ]
    for (const opts of cases) {
      const e = reverbLoopEnergy(opts)
      expect(e, JSON.stringify(opts)).toBeLessThan(1)
      if (!opts.freeze) {
        expect(e, JSON.stringify(opts)).toBeLessThanOrEqual(REVERB_LOOP_HEADROOM + 1e-9)
        expect(reverbLoopGains(opts).tank).toBe(0)
      }
    }
  })

  it('opens the tank only for freeze, never for a live tail', () => {
    const live = reverbLoopGains({ decaySec: 8, sizePct: 90, shimmer01: 0.2, huge: true, freeze: false })
    const frozen = reverbLoopGains({ decaySec: 8, sizePct: 90, shimmer01: 0.2, huge: true, freeze: true })
    expect(live.tank).toBe(0)
    expect(frozen.tank).toBeGreaterThan(0.15)
    expect(frozen.tank).toBeLessThan(0.3)
  })

  it('keeps shimmer as a quiet feed-forward sparkle', () => {
    const g = reverbLoopGains({ decaySec: 8, sizePct: 90, shimmer01: 0.5, huge: true, freeze: false })
    expect(g.shimmer).toBeGreaterThan(0.02)
    expect(g.shimmer).toBeLessThan(0.12)
    expect(g.tank).toBe(0)
  })
})
