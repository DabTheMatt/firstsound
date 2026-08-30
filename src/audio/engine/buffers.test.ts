import { describe, expect, it } from 'vitest'
import { reverseChannel, reverseTime } from './buffers'

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
