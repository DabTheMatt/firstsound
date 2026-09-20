import { describe, expect, it } from 'vitest'
import { duplicateMonoToStereo, mixChannelsToMono, nextChannelLayout } from './channelLayout'

describe('mixChannelsToMono', () => {
  it('averages stereo lanes', () => {
    const mixed = mixChannelsToMono([
      new Float32Array([1, 0.5]),
      new Float32Array([-1, 0.5]),
    ])
    expect(mixed[0]).toBeCloseTo(0)
    expect(mixed[1]).toBeCloseTo(0.5)
  })
})

describe('duplicateMonoToStereo', () => {
  it('copies the mono lane onto both sides', () => {
    const { left, right } = duplicateMonoToStereo(new Float32Array([0.25, -0.5]))
    expect(Array.from(left)).toEqual([0.25, -0.5])
    expect(Array.from(right)).toEqual([0.25, -0.5])
  })
})

describe('nextChannelLayout', () => {
  it('toggles off when the same action is pressed again', () => {
    expect(nextChannelLayout('mono', 'mono')).toBe('original')
    expect(nextChannelLayout('original', 'stereo')).toBe('stereo')
    expect(nextChannelLayout('stereo', 'mono')).toBe('mono')
  })
})
