import { describe, expect, it } from 'vitest'
import { fadeHandleAtLoopFrac } from './handleLayout'

describe('fadeHandleAtLoopFrac', () => {
  it('places the envelope diamond on the same X as the loop node', () => {
    expect(fadeHandleAtLoopFrac(0.2)).toBe(0.2)
    expect(fadeHandleAtLoopFrac(0.9)).toBe(0.9)
  })
})
