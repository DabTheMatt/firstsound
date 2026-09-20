import { describe, expect, it } from 'vitest'
import { detectBrowserLocale, parseLocale } from './locale'

describe('parseLocale', () => {
  it('maps Polish ids to English', () => {
    expect(parseLocale('en')).toBe('en')
    expect(parseLocale('pl')).toBe('en')
  })

  it('rejects unknown values', () => {
    expect(parseLocale('de')).toBeNull()
    expect(parseLocale('')).toBeNull()
    expect(parseLocale(null)).toBeNull()
  })
})

describe('detectBrowserLocale', () => {
  it('always uses English', () => {
    expect(detectBrowserLocale('pl')).toBe('en')
    expect(detectBrowserLocale('pl-PL')).toBe('en')
  })

  it('defaults to English', () => {
    expect(detectBrowserLocale('en-US')).toBe('en')
    expect(detectBrowserLocale(undefined)).toBe('en')
  })
})
