import { describe, expect, it } from 'vitest'
import { timeDomainPeakDb, louderPeakDb } from './timePeak'

describe('louderPeakDb', () => {
  it('keeps the finite louder reading', () => {
    expect(louderPeakDb(-12, -9)).toBe(-9)
    expect(louderPeakDb(Number.NEGATIVE_INFINITY, -6)).toBe(-6)
    expect(louderPeakDb(-3, Number.NEGATIVE_INFINITY)).toBe(-3)
  })
})

describe('timeDomainPeakDb', () => {
  it('returns -inf without an analyser', () => {
    expect(timeDomainPeakDb(null, { data: null })).toBe(Number.NEGATIVE_INFINITY)
  })
})
