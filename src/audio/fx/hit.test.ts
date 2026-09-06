import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { dragSpaceOverlay, hitSpaceOverlay } from './hit'
import { delayTaps, reverbTail } from './spaceModel'
import { SPACE_HANDLE_TOP_PX } from '../../components/waveform/handleLayout'

describe('space overlay hit', () => {
  it('grabs delay time near the first echo', () => {
    const p = defaultParamValues()
    p.delayWet = 50
    p.delayTime = 250
    const taps = delayTaps(p, 'digital', 120)
    const hit = hitSpaceOverlay(50, 40, 400, 100, 0, 2, 0, 'delay', taps, reverbTail(p, 'hall', 120))
    expect(hit?.kind).toBe('delayTime')
  })

  it('does not steal the top band or loop-edge X for reverb', () => {
    const p = defaultParamValues()
    p.reverbWet = 40
    p.reverbPredelay = 0
    p.reverbDecay = 8
    const tail = reverbTail(p, 'hall', 120)
    const taps = delayTaps(p, 'digital', 120)
    const top = hitSpaceOverlay(80, 12, 400, 200, 0, 4, 0, 'reverb', taps, tail, {
      xs: [40, 360],
      radius: 22,
      top: SPACE_HANDLE_TOP_PX,
    })
    expect(top).toBeNull()
    const onLoop = hitSpaceOverlay(40, 80, 400, 200, 0, 4, 0, 'reverb', taps, tail, {
      xs: [40, 360],
      radius: 22,
      top: SPACE_HANDLE_TOP_PX,
    })
    expect(onLoop).toBeNull()
    const body = hitSpaceOverlay(120, 100, 400, 200, 0, 4, 0, 'reverb', taps, tail, {
      xs: [40, 360],
      radius: 22,
      top: SPACE_HANDLE_TOP_PX,
    })
    expect(body?.kind).toBe('reverbSize')
  })

  it('maps a time drag onto delayTime', () => {
    const p = defaultParamValues()
    p.delayTime = 300
    const next = dragSpaceOverlay({ kind: 'delayTime' }, 0.3, 0.4, 50, 20, 100, p)
    expect(next.delayTime).toBeCloseTo(400)
    expect(next.delaySync).toBe(0)
    expect(next.delayWet).toBeUndefined()
  })
})
