import { describe, expect, it } from 'vitest'
import { findZeroCrossing } from './zeroCrossing'

function sine(len: number, freq = 4): Float32Array {
  const data = new Float32Array(len)
  for (let i = 0; i < len; i++) data[i] = Math.sin((2 * Math.PI * freq * i) / len)
  return data
}

describe('findZeroCrossing', () => {
  it('snaps near a true zero of a sine on both channels', () => {
    const ch = sine(1000, 4)
    const found = findZeroCrossing([ch, ch], 130, 80)
    expect(Math.abs(ch[found] ?? 1)).toBeLessThan(0.05)
  })

  it('prefers a quiet crossing over a nearby noisy one', () => {
    const quiet = new Float32Array(200)
    for (let i = 0; i < 200; i++) quiet[i] = i < 100 ? -0.01 : 0.01
    quiet[80] = 0.9
    quiet[81] = -0.9
    const found = findZeroCrossing([quiet], 90, 40)
    expect(found).toBeGreaterThan(90)
    expect(Math.abs(quiet[found] ?? 1)).toBeLessThan(0.05)
  })
})
