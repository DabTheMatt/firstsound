import { describe, expect, it } from 'vitest'
import { countNoun, polishCardinal } from './plural'

describe('polishCardinal', () => {
  const marker = { one: 'znacznik', few: 'znaczniki', many: 'znaczników' }
  const track = { one: 'ścieżka', few: 'ścieżki', many: 'ścieżek' }

  it('uses Polish forms for 1, 2, and 5', () => {
    expect(polishCardinal(1, marker)).toBe('znacznik')
    expect(polishCardinal(2, marker)).toBe('znaczniki')
    expect(polishCardinal(5, marker)).toBe('znaczników')
    expect(polishCardinal(1, track)).toBe('ścieżka')
    expect(polishCardinal(2, track)).toBe('ścieżki')
    expect(polishCardinal(5, track)).toBe('ścieżek')
  })

  it('treats teens as many and 22 as few', () => {
    expect(polishCardinal(12, marker)).toBe('znaczników')
    expect(polishCardinal(14, marker)).toBe('znaczników')
    expect(polishCardinal(22, marker)).toBe('znaczniki')
    expect(polishCardinal(0, marker)).toBe('znaczników')
  })
})

describe('countNoun', () => {
  it('formats channel counts in both languages', () => {
    const en = { one: 'channel', other: 'channels' }
    const pl = { one: 'kanał', few: 'kanały', many: 'kanałów' }
    expect(countNoun('en', 1, en, pl)).toBe('1 channel')
    expect(countNoun('en', 2, en, pl)).toBe('2 channels')
    expect(countNoun('pl', 1, en, pl)).toBe('1 kanał')
    expect(countNoun('pl', 2, en, pl)).toBe('2 kanały')
    expect(countNoun('pl', 5, en, pl)).toBe('5 kanałów')
  })
})
