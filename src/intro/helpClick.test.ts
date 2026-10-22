import { afterEach, describe, expect, it, vi } from 'vitest'
import { helpClicksOn, parseHelpClicks, resetHelpClicks, setHelpClicks, HELP_CLICK_KEY } from './helpClick'
import { claimStartupWelcome, resetStartupWelcome } from './startupWelcome'

afterEach(() => {
  resetHelpClicks()
  resetStartupWelcome()
  vi.unstubAllGlobals()
})

describe('help clicks', () => {
  it('stays on until the menu stores off', () => {
    expect(parseHelpClicks(null)).toBe(true)
    expect(parseHelpClicks('on')).toBe(true)
    expect(parseHelpClicks('off')).toBe(false)
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value)
      },
    })
    resetHelpClicks()
    expect(helpClicksOn()).toBe(true)
    setHelpClicks(false)
    expect(helpClicksOn()).toBe(false)
    expect(data.get(HELP_CLICK_KEY)).toBe('off')
    setHelpClicks(true)
    expect(data.get(HELP_CLICK_KEY)).toBe('on')
  })
})

describe('startup welcome', () => {
  it('offers the welcome once, so a mode change does not open it again', () => {
    expect(claimStartupWelcome()).toBe(true)
    expect(claimStartupWelcome()).toBe(false)
    resetStartupWelcome()
    expect(claimStartupWelcome()).toBe(true)
  })
})
