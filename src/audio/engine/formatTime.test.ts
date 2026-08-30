import { describe, expect, it } from 'vitest'
import { formatTimecode } from './formatTime'

describe('formatTimecode', () => {
  it('formats minutes, seconds and milliseconds', () => {
    expect(formatTimecode(0)).toBe('00:00.000')
    expect(formatTimecode(30.25)).toBe('00:30.250')
    expect(formatTimecode(161.786)).toBe('02:41.786')
  })
})
