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
      if (!opts.freeze) expect(e, JSON.stringify(opts)).toBeLessThanOrEqual(REVERB_LOOP_HEADROOM + 1e-9)
    }
  })

  it('uses less tank as decay gets longer, because the IR already blooms', () => {
    const short = reverbLoopGains({ decaySec: 1, sizePct: 80, shimmer01: 0, huge: false, freeze: false })
    const long = reverbLoopGains({ decaySec: 18, sizePct: 80, shimmer01: 0, huge: false, freeze: false })
    expect(long.tank).toBeLessThan(short.tank)
  })

  it('gives shimmer a slice without eating the whole loop', () => {
    const g = reverbLoopGains({ decaySec: 8, sizePct: 90, shimmer01: 0.5, huge: true, freeze: false })
    expect(g.shimmer).toBeGreaterThan(0.05)
    expect(g.shimmer).toBeLessThan(0.22)
    expect(g.tank + g.shimmer).toBeLessThanOrEqual(REVERB_LOOP_HEADROOM)
  })
})
