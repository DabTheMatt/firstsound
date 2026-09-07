import { describe, expect, it } from 'vitest'
import { detectBrowserLocale, parseLocale } from './locale'

describe('parseLocale', () => {
  it('accepts en and pl', () => {
    expect(parseLocale('en')).toBe('en')
    expect(parseLocale('pl')).toBe('pl')
  })

  it('rejects unknown values', () => {
    expect(parseLocale('de')).toBeNull()
    expect(parseLocale('')).toBeNull()
    expect(parseLocale(null)).toBeNull()
  })
})

describe('detectBrowserLocale', () => {
  it('picks Polish from pl and pl-PL', () => {
    expect(detectBrowserLocale('pl')).toBe('pl')
    expect(detectBrowserLocale('pl-PL')).toBe('pl')
  })

  it('defaults to English', () => {
    expect(detectBrowserLocale('en-US')).toBe('en')
    expect(detectBrowserLocale(undefined)).toBe('en')
  })
})
