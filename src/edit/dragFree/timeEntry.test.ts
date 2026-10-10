import { describe, expect, it } from 'vitest'
import { formatTimecode } from '../../audio/engine/formatTime'
import { formatEditTime, parseEditTime, speakEditTime } from './timeEntry'

describe('drag-free time entry', () => {
  it('formats and parses the project clock without a second conversion', () => {
    expect(formatEditTime(83.45)).toBe(formatTimecode(83.45, 3))
    const parsed = parseEditTime('01:23.450')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(Math.round(parsed.seconds * 1000)).toBe(83450)
    const again = parseEditTime(formatEditTime(parsed.seconds))
    expect(again).toEqual(parsed)
  })

  it('accepts seconds and milliseconds', () => {
    const seconds = parseEditTime('12.350')
    const millis = parseEditTime('250 ms')
    expect(seconds.ok && Math.round(seconds.seconds * 1000)).toBe(12350)
    expect(millis.ok && Math.round(millis.seconds * 1000)).toBe(250)
  })

  it('rejects negative times and broken clocks', () => {
    const negative = parseEditTime('-1')
    expect(negative.ok).toBe(false)
    if (negative.ok) return
    expect(negative.error).toBe('negative')
    expect(parseEditTime('01:99.000').ok).toBe(false)
    expect(parseEditTime('nope').ok).toBe(false)
    expect(parseEditTime('').ok).toBe(false)
  })

  it('speaks milliseconds, not samples', () => {
    expect(speakEditTime(12.35, 'en')).toBe('12.35 seconds')
    expect(speakEditTime(83.45, 'en')).toContain('minutes')
    expect(speakEditTime(12.35, 'pl')).toContain('sekund')
  })
})
