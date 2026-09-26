import { describe, expect, it } from 'vitest'
import { lfoUiState, resolveLfoSectionOpen, storedExpansionForSection } from './lfoOpen'

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

describe('lfo section states stay separate', () => {
  it('keeps instance, connection, and expansion as different flags', () => {
    const state = lfoUiState([{ target: null }, { target: 'eq1Freq' }], false)
    expect(state.hasLfoInstance).toBe(true)
    expect(state.isLfoConnected).toBe(true)
    expect(state.isLfoExpanded).toBe(false)
  })

  it('does not treat a bare LFO instance as expanded or connected', () => {
    const state = lfoUiState([{ target: null }], false)
    expect(state.hasLfoInstance).toBe(true)
    expect(state.isLfoConnected).toBe(false)
    expect(state.isLfoExpanded).toBe(false)
  })

  it('ignores a previous kind expansion when the band owns the flag', () => {
    expect(
      storedExpansionForSection({
        bandId: 'eqb-new',
        bandExpanded: false,
        kindStored: true,
      }),
    ).toBe(false)
    expect(lfoUiState([{ target: null }], false).isLfoExpanded).toBe(false)
  })
})
