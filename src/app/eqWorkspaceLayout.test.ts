import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  parseEqWorkspaceLayout,
  persistEqWorkspaceLayout,
  readStoredEqWorkspaceLayout,
} from './eqWorkspaceLayout'

describe('eq workspace layout', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
  })

  it('defaults to the inspector and only accepts the strips token', () => {
    expect(parseEqWorkspaceLayout(null)).toBe('inspector')
    expect(parseEqWorkspaceLayout('both')).toBe('inspector')
    expect(parseEqWorkspaceLayout('strips')).toBe('strips')
    expect(readStoredEqWorkspaceLayout()).toBe('inspector')
    persistEqWorkspaceLayout('strips')
    expect(readStoredEqWorkspaceLayout()).toBe('strips')
  })
})
