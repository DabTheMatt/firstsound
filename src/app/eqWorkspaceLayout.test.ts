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

  it('defaults to strips and only accepts the inspector token', () => {
    expect(parseEqWorkspaceLayout(null)).toBe('strips')
    expect(parseEqWorkspaceLayout('both')).toBe('strips')
    expect(parseEqWorkspaceLayout('inspector')).toBe('inspector')
    expect(readStoredEqWorkspaceLayout()).toBe('strips')
    persistEqWorkspaceLayout('inspector')
    expect(readStoredEqWorkspaceLayout()).toBe('inspector')
  })
})
