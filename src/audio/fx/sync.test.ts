import { describe, expect, it } from 'vitest'
import { syncedDelayMs, nearestNote } from './sync'

describe('syncedDelayMs', () => {
  it('maps 1/4 at 120 BPM to 500 ms', () => {
    expect(syncedDelayMs(120, '1/4', 'straight')).toBeCloseTo(500)
  })

  it('dots and triplets scale the note', () => {
    expect(syncedDelayMs(120, '1/8', 'dotted')).toBeCloseTo(375)
    expect(syncedDelayMs(120, '1/8', 'triplet')).toBeCloseTo(250 * (2 / 3))
  })

  it('includes 1/64 through 2/1', () => {
    expect(syncedDelayMs(120, '1/64', 'straight')).toBeCloseTo(31.25)
    expect(syncedDelayMs(120, '2/1', 'straight')).toBeCloseTo(4000)
  })
})

describe('nearestNote', () => {
  it('finds dotted 1/8 near 375 ms', () => {
    const n = nearestNote(375, 120)
    expect(n.division).toBe('1/8')
    expect(n.kind).toBe('dotted')
  })
})
