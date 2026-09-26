import { describe, expect, it } from 'vitest'
import {
  ANTI_CLICK_SEC,
  antiClickSeconds,
  applyLinearEdges,
  crossfadeInsert,
  loopCrossfadeSeconds,
  maxAdjacentDelta,
  nextLoopSegment,
  renderCrossfadedLoop,
  renderHardLoop,
} from './antiClick'

function sine(length: number, sampleRate: number, hz: number, phase = 0.4): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    out[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate + phase)
  }
  return out
}

describe('antiClickSeconds', () => {
  it('stays a few milliseconds at common rates and grows with playback speed', () => {
    expect(antiClickSeconds(48000, 1)).toBe(ANTI_CLICK_SEC)
    expect(antiClickSeconds(96000, 1)).toBe(ANTI_CLICK_SEC)
    expect(antiClickSeconds(8000, 1)).toBeCloseTo(64 / 8000, 5)
    expect(antiClickSeconds(48000, 4)).toBeGreaterThan(antiClickSeconds(48000, 1))
    expect(antiClickSeconds(48000, 4)).toBeLessThanOrEqual(0.012)
  })

  it('keeps the loop crossfade inside a short region', () => {
    expect(loopCrossfadeSeconds(48000, 1, 2)).toBeCloseTo(ANTI_CLICK_SEC, 5)
    expect(loopCrossfadeSeconds(48000, 1, 0.02)).toBeLessThan(0.005)
    expect(loopCrossfadeSeconds(48000, 1, 0.02)).toBeGreaterThan(0.001)
  })
})

describe('nextLoopSegment', () => {
  it('overlaps later passes by the same crossfade and does not accumulate', () => {
    let cursor = { when: 0, offset: 0.25 }
    const segments = []
    for (let i = 0; i < 20; i++) {
      const step = nextLoopSegment(cursor, 0, 1, true, 0.005)
      segments.push(step.segment)
      expect(step.next).not.toBeNull()
      cursor = step.next!
    }
    expect(segments[0]?.offset).toBeCloseTo(0.25)
    expect(segments[0]?.duration).toBeCloseTo(0.75)
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]?.offset).toBe(0)
      expect(segments[i]?.duration).toBeCloseTo(1)
      const gap = (segments[i]?.when ?? 0) - (segments[i - 1]?.when ?? 0)
      expect(gap).toBeCloseTo(i === 1 ? 0.745 : 0.995, 5)
      const overlap =
        (segments[i - 1]?.when ?? 0) + (segments[i - 1]?.duration ?? 0) - (segments[i]?.when ?? 0)
      expect(overlap).toBeCloseTo(0.005, 5)
    }
    expect(segments).toHaveLength(20)
  })

  it('stops after one pass when looping is off', () => {
    const step = nextLoopSegment({ when: 1, offset: 0 }, 0, 0.5, false, 0.005)
    expect(step.next).toBeNull()
    expect(step.segment.duration).toBeCloseTo(0.5)
    expect(step.segment.fadeIn).toBeGreaterThan(0)
    expect(step.segment.fadeOut).toBeGreaterThan(0)
  })
})

describe('render boundaries', () => {
  it('removes the step at a loop seam on a steady tone', () => {
    const sr = 48000
    const src = sine(sr, sr, 90, 1.7)
    const hard = renderHardLoop(src, sr, 0.013, 0.41, 5)
    const soft = renderCrossfadedLoop(src, sr, 0.013, 0.41, 5, antiClickSeconds(sr, 1))
    const hardDelta = maxAdjacentDelta(hard, 200, hard.length - 200)
    const softDelta = maxAdjacentDelta(soft, 200, soft.length - 200)
    expect(hardDelta).toBeGreaterThan(0.4)
    expect(softDelta).toBeLessThan(hardDelta * 0.35)
    expect(softDelta).toBeLessThan(0.2)
  })

  it('keeps the seam small across many passes', () => {
    const sr = 44100
    const src = sine(Math.floor(sr * 0.8), sr, 220, 0.2)
    const soft = renderCrossfadedLoop(src, sr, 0.02, 0.55, 20, 0.005)
    expect(maxAdjacentDelta(soft, 100, soft.length - 100)).toBeLessThan(0.25)
  })

  it('ramps a transport edge instead of entering at full amplitude', () => {
    const sr = 48000
    const tone = sine(Math.floor(sr * 0.05), sr, 440, Math.PI / 2)
    const hard = Math.abs(tone[0] ?? 0)
    const faded = applyLinearEdges(tone, Math.round(sr * 0.005), Math.round(sr * 0.005))
    expect(hard).toBeGreaterThan(0.9)
    expect(Math.abs(faded[0] ?? 1)).toBeLessThan(0.001)
    expect(maxAdjacentDelta(faded, 1, Math.round(sr * 0.005) + 2)).toBeLessThan(hard * 0.2)
    expect(Math.abs(faded[faded.length - 1] ?? 1)).toBeLessThan(0.02)
  })

  it('crossfades a filter insert instead of switching samples', () => {
    const n = 800
    const dry = new Float32Array(n).fill(0.9)
    const wet = new Float32Array(n).fill(-0.9)
    const cut = 200
    const hard = crossfadeInsert(dry, wet, cut, 1)
    const soft = crossfadeInsert(dry, wet, cut, 80)
    expect(maxAdjacentDelta(hard, cut - 2, cut + 4)).toBeGreaterThan(1)
    expect(maxAdjacentDelta(soft, cut - 2, cut + 90)).toBeLessThan(0.05)
  })
})
