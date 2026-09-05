import { describe, expect, it } from 'vitest'
import { isStandaloneDisplay } from './displayMode'

describe('isStandaloneDisplay', () => {
  it('treats iOS navigator.standalone as an installed app', () => {
    expect(isStandaloneDisplay({ standalone: true }, () => ({ matches: false }))).toBe(true)
  })

  it('treats CSS display-mode standalone as an installed app', () => {
    const matchMedia = (query: string) => ({ matches: query.includes('standalone') })
    expect(isStandaloneDisplay({}, matchMedia)).toBe(true)
  })

  it('is false in a normal browser tab', () => {
    expect(isStandaloneDisplay({}, () => ({ matches: false }))).toBe(false)
  })

  it('treats ?pwa=1 as an installed-app preview', () => {
    expect(isStandaloneDisplay({}, () => ({ matches: false }), '?pwa=1')).toBe(true)
  })
})
