import { describe, expect, it } from 'vitest'
import { arrowKeyOwnerClaimsKeys, type ArrowKeyOwner } from './playheadKeys'

function owner(patch: Partial<ArrowKeyOwner> = {}): ArrowKeyOwner {
  return {
    tagName: 'DIV',
    role: 'region',
    editable: false,
    embeddedArrowControl: false,
    ...patch,
  }
}

describe('arrowKeyOwnerClaimsKeys', () => {
  it('leaves the waveform editor free to move the playhead', () => {
    expect(arrowKeyOwnerClaimsKeys(owner())).toBe(false)
    expect(arrowKeyOwnerClaimsKeys(owner({ tagName: 'CANVAS', role: null }))).toBe(false)
  })

  it('yields arrows to selects, text, knobs, sliders, and automation controls', () => {
    expect(arrowKeyOwnerClaimsKeys(owner({ tagName: 'SELECT', role: null }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ tagName: 'TEXTAREA', role: null }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ tagName: 'INPUT', role: null }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ tagName: 'BUTTON', role: null }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ role: 'slider' }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ role: 'spinbutton' }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ role: 'combobox' }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ role: 'tab' }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ role: 'radiogroup' }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ editable: true }))).toBe(true)
    expect(arrowKeyOwnerClaimsKeys(owner({ embeddedArrowControl: true }))).toBe(true)
  })
})
