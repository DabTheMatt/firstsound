import { describe, expect, it } from 'vitest'
import { formatTimecode, timecodeDigits } from './formatTime'

describe('formatTimecode', () => {
  it('formats minutes, seconds and milliseconds', () => {
    expect(formatTimecode(0)).toBe('00:00.000')
    expect(formatTimecode(30.25)).toBe('00:30.250')
    expect(formatTimecode(161.786)).toBe('02:41.786')
  })

  it('can show an extra digit at high zoom without claiming sample accuracy', () => {
    expect(formatTimecode(1.23456, 4)).toBe('00:01.2346')
    expect(timecodeDigits(2)).toBe(3)
    expect(timecodeDigits(0.2)).toBe(4)
  })
})
