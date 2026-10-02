import { describe, expect, it } from 'vitest'
import { planProjectStart, projectDurationOf } from './schedule'

describe('project transport schedule', () => {
  it('uses the longest loaded track as the project duration', () => {
    expect(
      projectDurationOf([
        { id: 'a', duration: 4 },
        { id: 'b', duration: 12 },
        { id: 'c', duration: 8 },
      ]),
    ).toBe(12)
  })

  it('schedules every voice against one AudioContext time and one origin', () => {
    const plan = planProjectStart(
      [
        { id: 'stereo', duration: 10 },
        { id: 'mono', duration: 6 },
        { id: 'empty', duration: 0 },
        { id: 'late', duration: 4 },
      ],
      7.5,
      100,
    )
    expect(plan.when).toBeCloseTo(100.02)
    expect(plan.origin).toBe(7.5)
    expect(plan.voices).toEqual([{ id: 'stereo', offset: 7.5 }])
    const offsets = new Set(plan.voices.map((voice) => voice.offset))
    expect(offsets.size).toBe(1)
  })

  it('starts identical transients on the same offset', () => {
    const plan = planProjectStart(
      [
        { id: 'click-a', duration: 2 },
        { id: 'click-b', duration: 2 },
        { id: 'click-c', duration: 2 },
        { id: 'click-d', duration: 2 },
      ],
      0,
      20,
    )
    expect(plan.voices).toHaveLength(4)
    expect(new Set(plan.voices.map((voice) => voice.offset))).toEqual(new Set([0]))
    expect(plan.when).toBe(20.02)
  })

  it('leaves a finished track silent', () => {
    const plan = planProjectStart(
      [
        { id: 'short', duration: 4 },
        { id: 'long', duration: 12 },
      ],
      4,
      0,
    )
    expect(plan.voices.map((voice) => voice.id)).toEqual(['long'])
  })
})
