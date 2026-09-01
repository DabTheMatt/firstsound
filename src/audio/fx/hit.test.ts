import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { dragSpaceOverlay, hitSpaceOverlay } from './hit'
import { delayTaps, reverbTail } from './spaceModel'

describe('space overlay hit', () => {
  it('grabs delay time near the first echo', () => {
    const p = defaultParamValues()
    p.spaceMix = 50
    p.delayTime = 250
    const taps = delayTaps(p, 'digital', 120)
    const hit = hitSpaceOverlay(50, 40, 400, 100, 0, 2, 0, 'delay', taps, reverbTail(p, 'hall', 120))
    expect(hit?.kind).toBe('delayTime')
  })

  it('maps a time drag onto delayTime', () => {
    const p = defaultParamValues()
    p.delayTime = 300
    const next = dragSpaceOverlay({ kind: 'delayTime' }, 0.3, 0.4, 50, 20, 100, p)
    expect(next.delayTime).toBeCloseTo(400)
    expect(next.delaySync).toBe(0)
    expect(next.spaceMix).toBeGreaterThan(p.spaceMix)
  })
})
