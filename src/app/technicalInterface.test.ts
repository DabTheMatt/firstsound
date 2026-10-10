import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseTechnicalInterface,
  persistTechnicalInterface,
  readStoredTechnicalInterface,
  subscribeTechnicalInterface,
  TECHNICAL_INTERFACES,
  TECHNICAL_INTERFACE_KEY,
} from './technicalInterface'
import { UI_MODES } from '../modes/uiMode'

describe('technical interface preference', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens Workspace unless Classic was stored', () => {
    expect(parseTechnicalInterface(null)).toBe('workspace')
    expect(parseTechnicalInterface(undefined)).toBe('workspace')
    expect(parseTechnicalInterface('')).toBe('workspace')
    expect(parseTechnicalInterface('classic')).toBe('classic')
    expect(parseTechnicalInterface('experimental')).toBe('classic')
    expect(parseTechnicalInterface('workspace')).toBe('workspace')
  })

  it('does not add a fourth top-level mode', () => {
    expect([...UI_MODES]).toEqual(['simple', 'technical', 'sensory'])
    expect([...TECHNICAL_INTERFACES]).toEqual(['classic', 'workspace'])
  })

  it('persists and reads the preference without touching audio state', () => {
    const mem = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mem.set(key, value)
      },
    })
    const seen: string[] = []
    const stop = subscribeTechnicalInterface(() => {
      seen.push(readStoredTechnicalInterface())
    })
    persistTechnicalInterface('workspace')
    expect(mem.get(TECHNICAL_INTERFACE_KEY)).toBe('workspace')
    expect(readStoredTechnicalInterface()).toBe('workspace')
    persistTechnicalInterface('classic')
    expect(readStoredTechnicalInterface()).toBe('classic')
    expect(seen).toEqual(['workspace', 'classic'])
    stop()
  })
})
