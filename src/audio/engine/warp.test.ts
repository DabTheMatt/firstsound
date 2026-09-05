import { describe, expect, it } from 'vitest'
import { clampWarpTime, neighborTimes, remapWarpTimes, warpChannel } from './warp'

describe('warp markers', () => {
  it('clamps a marker between neighbors', () => {
    expect(clampWarpTime(0.5, 0.2, 0.8)).toBeCloseTo(0.5)
    expect(clampWarpTime(0, 0.2, 0.8)).toBeGreaterThan(0.2)
    expect(clampWarpTime(2, 0.2, 0.8)).toBeLessThan(0.8)
  })

  it('stretches times around the moved marker', () => {
    const next = remapWarpTimes([0.2, 0.5, 0.9], 0.5, 0.6, 0.2, 0.9)
    expect(next[1]).toBeCloseTo(0.6)
    expect(next[0]).toBeCloseTo(0.2)
    expect(next[2]).toBeCloseTo(0.9)
  })

  it('reports neighbors including file edges', () => {
    expect(neighborTimes([0.4, 0.8], 0, 2)).toEqual({ prev: 0, next: 0.8 })
    expect(neighborTimes([0.4, 0.8], 1, 2)).toEqual({ prev: 0.4, next: 2 })
  })
})

describe('warpChannel', () => {
  it('moves a pulse later and keeps total length', () => {
    const sr = 1000
    const src = new Float32Array(1000)
    for (let i = 200; i < 220; i++) src[i] = 1
    const out = warpChannel(src, sr, 0.2, 0.45, 0, 1)
    expect(out.length).toBe(1000)
    let peak = 0
    let at = 0
    for (let i = 0; i < out.length; i++) {
      if ((out[i] ?? 0) > peak) {
        peak = out[i] ?? 0
        at = i
      }
    }
    expect(peak).toBeGreaterThan(0.9)
    expect(at / sr).toBeGreaterThan(0.35)
    expect(at / sr).toBeLessThan(0.55)
  })
})
