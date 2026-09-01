import { describe, expect, it } from 'vitest'
import { insetHandleFrac } from './handleLayout'

describe('insetHandleFrac', () => {
  it('keeps a far envelope handle where it is', () => {
    expect(insetHandleFrac(0.1, 0.25, 0.04, 1)).toBeCloseTo(0.25)
    expect(insetHandleFrac(0.8, 0.6, 0.04, -1)).toBeCloseTo(0.6)
  })

  it('pushes a coinciding envelope handle inward off the loop node', () => {
    expect(insetHandleFrac(0.2, 0.2, 0.05, 1)).toBeCloseTo(0.25)
    expect(insetHandleFrac(0.9, 0.9, 0.05, -1)).toBeCloseTo(0.85)
  })
})
