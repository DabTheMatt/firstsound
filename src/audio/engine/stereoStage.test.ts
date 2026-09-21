import { describe, expect, it } from 'vitest'
import { panNorm, stereoRouteGains, waveformLaneLayout } from './stereoStage'

describe('stereoRouteGains', () => {
  it('keeps channels separate in stereo', () => {
    expect(stereoRouteGains(false)).toEqual({
      leftToL: 1,
      leftToR: 0,
      rightToL: 0,
      rightToR: 1,
    })
  })

  it('sums equally when making mono', () => {
    expect(stereoRouteGains(true)).toEqual({
      leftToL: 0.5,
      leftToR: 0.5,
      rightToL: 0.5,
      rightToR: 0.5,
    })
  })

  it('copies a one-channel file onto both speakers', () => {
    expect(stereoRouteGains(false, 1)).toEqual({
      leftToL: 1,
      leftToR: 1,
      rightToL: 0,
      rightToR: 0,
    })
  })

  it('still folds when Make mono is on, even if the last file was one channel', () => {
    expect(stereoRouteGains(true, 1)).toEqual({
      leftToL: 0.5,
      leftToR: 0.5,
      rightToL: 0.5,
      rightToR: 0.5,
    })
  })
})

describe('panNorm', () => {
  it('maps percent to StereoPanner range', () => {
    expect(panNorm(0)).toBe(0)
    expect(panNorm(-100)).toBe(-1)
    expect(panNorm(50)).toBe(0.5)
    expect(panNorm(200)).toBe(1)
  })
})

describe('waveformLaneLayout', () => {
  it('stays one lane for a mono file', () => {
    expect(waveformLaneLayout({
      foldMono: false,
      stereoLayout: false,
      sourceChannels: 1,
      panPct: 0,
      leftDb: 0,
      rightDb: 0,
    }).lanes).toBe(1)
  })

  it('duplicates a mono file onto two lanes when Make stereo is on', () => {
    const layout = waveformLaneLayout({
      foldMono: false,
      stereoLayout: true,
      sourceChannels: 1,
      panPct: 0,
      leftDb: 0,
      rightDb: 0,
    })
    expect(layout.lanes).toBe(2)
    expect(layout.gains[0]).toBeCloseTo(layout.gains[1])
  })

  it('collapses to one lane when Make mono is on', () => {
    expect(waveformLaneLayout({
      foldMono: true,
      stereoLayout: true,
      sourceChannels: 2,
      panPct: 0,
      leftDb: 0,
      rightDb: 0,
    }).lanes).toBe(1)
  })

  it('scales left and right lanes from pan and balance', () => {
    const left = waveformLaneLayout({
      foldMono: false,
      stereoLayout: true,
      sourceChannels: 2,
      panPct: -100,
      leftDb: 0,
      rightDb: 0,
    })
    expect(left.gains[0]).toBeGreaterThan(left.gains[1])
    const quietR = waveformLaneLayout({
      foldMono: false,
      stereoLayout: true,
      sourceChannels: 2,
      panPct: 0,
      leftDb: 0,
      rightDb: -12,
    })
    expect(quietR.gains[0]).toBeGreaterThan(quietR.gains[1])
  })
})
