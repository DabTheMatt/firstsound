import { describe, expect, it } from 'vitest'
import { resolveLfoSectionOpen } from './lfoOpen'

describe('resolveLfoSectionOpen', () => {
  it('starts collapsed when a new band has no connected LFO', () => {
    expect(resolveLfoSectionOpen(undefined, false)).toBe(false)
  })

  it('may start open when an LFO is already connected and the user has not chosen', () => {
    expect(resolveLfoSectionOpen(undefined, true)).toBe(true)
  })

  it('keeps an explicit collapse even if an LFO stays connected', () => {
    expect(resolveLfoSectionOpen(false, true)).toBe(false)
  })

  it('keeps an explicit expand without requiring a connection', () => {
    expect(resolveLfoSectionOpen(true, false)).toBe(true)
  })
})
