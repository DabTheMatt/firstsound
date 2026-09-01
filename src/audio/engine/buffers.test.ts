import { describe, expect, it } from 'vitest'
import { applyGainInPlace, pingPongChannel, reverseChannel, reverseRegionInPlace, reverseTime } from './buffers'

describe('reverseRegionInPlace', () => {
  it('reverses only the selected span', () => {
    const data = new Float32Array([0, 1, 2, 3, 4])
    reverseRegionInPlace(data, 1, 4)
    expect(Array.from(data)).toEqual([0, 3, 2, 1, 4])
  })
})

describe('applyGainInPlace', () => {
  it('scales only the selected span', () => {
    const data = new Float32Array([1, 0.5, 0.25, 1])
    applyGainInPlace(data, 1, 3, 2)
    expect(Array.from(data)).toEqual([1, 1, 0.5, 1])
  })
})

describe('reverseChannel', () => {
  it('reverses sample order without mutating the input', () => {
    const input = new Float32Array([0, 0.25, 0.5, 1])
    const out = reverseChannel(input)
    expect(Array.from(out)).toEqual([1, 0.5, 0.25, 0])
    expect(Array.from(input)).toEqual([0, 0.25, 0.5, 1])
  })

  it('handles empty channels', () => {
    expect(reverseChannel(new Float32Array()).length).toBe(0)
  })
})

describe('reverseTime', () => {
  it('mirrors a position across the buffer length', () => {
    expect(reverseTime(2, 10)).toBe(8)
    expect(reverseTime(0, 10)).toBe(10)
  })

  it('never returns a negative position', () => {
    expect(reverseTime(11, 10)).toBe(0)
  })
})

describe('pingPongChannel', () => {
  it('concatenates the region forwards then backwards', () => {
    const input = new Float32Array([9, 1, 2, 3, 9])
    // region [1,4) = [1,2,3] -> forward + mirrored
    expect(Array.from(pingPongChannel(input, 1, 4))).toEqual([1, 2, 3, 3, 2, 1])
  })

  it('is symmetric (a palindrome) so looping turns around smoothly', () => {
    const out = pingPongChannel(new Float32Array([0, 0.5, 1]), 0, 3)
    const reversed = Array.from(out).reverse()
    expect(Array.from(out)).toEqual(reversed)
  })

  it('clamps out-of-range indices', () => {
    expect(pingPongChannel(new Float32Array([1, 2]), 0, 99).length).toBe(4)
  })
})
