import { describe, expect, it } from 'vitest'
import { compressorNeedleRadians } from './compressorNeedle'

describe('compressorNeedleRadians', () => {
  it('rests on the right and swings left as gain reduction grows', () => {
    const rest = compressorNeedleRadians(0)
    const working = compressorNeedleRadians(-12)
    const deep = compressorNeedleRadians(-24)
    expect(rest).toBeGreaterThan(working)
    expect(working).toBeGreaterThan(deep)
    expect(compressorNeedleRadians(-40)).toBeCloseTo(deep)
    expect(compressorNeedleRadians(3)).toBeCloseTo(rest)
    expect(rest).toBeGreaterThan(-Math.PI / 2)
    expect(deep).toBeLessThan(-Math.PI / 2)
  })
})
