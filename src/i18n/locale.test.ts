import { describe, expect, it } from 'vitest'
import {
  UI_LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  initialLocale,
  parseLocale,
  persistLocale,
  readStoredLocale,
} from './locale'

describe('parseLocale', () => {
  it('accepts English and Polish', () => {
    expect(parseLocale('en')).toBe('en')
    expect(parseLocale('EN')).toBe('en')
    expect(parseLocale('en-US')).toBe('en')
    expect(parseLocale('pl')).toBe('pl')
    expect(parseLocale('pl-PL')).toBe('pl')
  })

  it('rejects unknown values', () => {
    expect(parseLocale('de')).toBeNull()
    expect(parseLocale('')).toBeNull()
    expect(parseLocale(null)).toBeNull()
  })
})

describe('detectBrowserLocale', () => {
  it('stays English when nothing is saved', () => {
    expect(detectBrowserLocale('pl')).toBe('en')
    expect(detectBrowserLocale('pl-PL')).toBe('en')
    expect(detectBrowserLocale('en-US')).toBe('en')
    expect(detectBrowserLocale(undefined)).toBe('en')
  })
})

describe('stored locale', () => {
  it('round-trips Polish and falls back to English', () => {
    const memory = new Map<string, string>()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
    }
    const previous = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    try {
      expect(readStoredLocale()).toBeNull()
      expect(initialLocale()).toBe('en')
      persistLocale('pl')
      expect(memory.get(UI_LOCALE_STORAGE_KEY)).toBe('pl')
      expect(readStoredLocale()).toBe('pl')
      expect(initialLocale()).toBe('pl')
      persistLocale('en')
      expect(initialLocale()).toBe('en')
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous })
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})
