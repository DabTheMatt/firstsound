import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialUiMode, parseUiMode, UI_MODE_STORAGE_KEY, UI_MODES } from './uiMode'

describe('UI_MODES', () => {
  it('lists Simple, Technical, then Sensory', () => {
    expect([...UI_MODES]).toEqual(['simple', 'technical', 'sensory'])
  })
})

describe('parseUiMode', () => {
  it('accepts the three interface layers', () => {
    expect(parseUiMode('simple')).toBe('simple')
    expect(parseUiMode('sensory')).toBe('sensory')
    expect(parseUiMode('technical')).toBe('technical')
  })

  it('rejects unknown values', () => {
    expect(parseUiMode('beginner')).toBeNull()
    expect(parseUiMode('')).toBeNull()
    expect(parseUiMode(null)).toBeNull()
  })
})

describe('initialUiMode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens Technical when nothing is stored', () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(initialUiMode()).toBe('technical')
  })

  it('keeps a saved Simple or Sensory choice', () => {
    const mem = new Map<string, string>([[UI_MODE_STORAGE_KEY, 'sensory']])
    vi.stubGlobal('localStorage', { getItem: (key: string) => mem.get(key) ?? null })
    expect(initialUiMode()).toBe('sensory')
    mem.set(UI_MODE_STORAGE_KEY, 'simple')
    expect(initialUiMode()).toBe('simple')
  })
})
