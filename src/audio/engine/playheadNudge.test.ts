import { describe, expect, it } from 'vitest'
import {
  PLAYHEAD_NUDGE_COARSE_SEC,
  PLAYHEAD_NUDGE_SEC,
  playheadNudgeSeconds,
} from './playheadNudge'

describe('playheadNudgeSeconds', () => {
  it('uses a 10 ms step and a 100 ms step with Shift', () => {
    expect(PLAYHEAD_NUDGE_SEC).toBe(0.01)
    expect(PLAYHEAD_NUDGE_COARSE_SEC).toBe(0.1)
    expect(playheadNudgeSeconds('ArrowLeft', false)).toBe(-0.01)
    expect(playheadNudgeSeconds('ArrowRight', false)).toBe(0.01)
    expect(playheadNudgeSeconds('ArrowLeft', true)).toBe(-0.1)
    expect(playheadNudgeSeconds('ArrowRight', true)).toBe(0.1)
  })

  it('ignores keys that are not horizontal arrows', () => {
    expect(playheadNudgeSeconds('ArrowUp', false)).toBeNull()
    expect(playheadNudgeSeconds('ArrowDown', true)).toBeNull()
    expect(playheadNudgeSeconds('Home', false)).toBeNull()
    expect(playheadNudgeSeconds('a', false)).toBeNull()
  })
})
