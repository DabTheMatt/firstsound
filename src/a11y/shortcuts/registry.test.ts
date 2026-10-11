import { describe, expect, it } from 'vitest'
import { EN, PL } from '../../i18n/messages'
import { destinationIds } from './destinations'
import {
  combosEqual,
  formatCombo,
  matchShortcut,
  SHORTCUTS,
  shortcutConflicts,
  type KeyEventLike,
} from './registry'

function key(partial: Partial<KeyEventLike> & Pick<KeyEventLike, 'key'>): KeyEventLike {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...partial,
  }
}

describe('shortcut registry', () => {
  it('has no overlapping shortcuts in the same scope', () => {
    expect(shortcutConflicts()).toEqual([])
  })

  it('covers every shortcut in English and Polish', () => {
    for (const item of SHORTCUTS) {
      expect(EN.keyboard.byId[item.id], item.id).toBeTruthy()
      expect(PL.keyboard.byId[item.id], item.id).toBeTruthy()
    }
    for (const id of destinationIds('technical')) {
      expect(EN.keyboard.destinations[id]).toBeTruthy()
      expect(PL.keyboard.destinations[id]).toBeTruthy()
    }
  })

  it('matches modifiers on macOS and Windows without stealing bare letters', () => {
    const open = matchShortcut(key({ key: 'k', ctrlKey: true, shiftKey: true }))
    expect(open?.id).toBe('nav.workspaces')
    expect(matchShortcut(key({ key: 'k', metaKey: true, shiftKey: true }))?.id).toBe('nav.workspaces')
    expect(matchShortcut(key({ key: 'k', ctrlKey: true }))).toBeNull()
    expect(matchShortcut(key({ key: 'k' }))).toBeNull()
    expect(matchShortcut(key({ key: 'z', metaKey: true, shiftKey: true }))?.id).toBe('edit.redo')
    expect(matchShortcut(key({ key: 'z', ctrlKey: true }))?.id).toBe('edit.undo')
    expect(matchShortcut(key({ key: 'y', ctrlKey: true }))?.id).toBe('edit.redoY')
  })

  it('ignores IME composition and keeps Shift+? as the help chord', () => {
    expect(matchShortcut(key({ key: 'k', ctrlKey: true, shiftKey: true, isComposing: true }))).toBeNull()
    expect(matchShortcut(key({ key: 'Process', ctrlKey: true }))).toBeNull()
    expect(matchShortcut(key({ key: '?', ctrlKey: true, shiftKey: true }))?.id).toBe('nav.help')
  })

  it('formats chords without translating the key names', () => {
    const nav = SHORTCUTS.find((item) => item.id === 'nav.workspaces')
    expect(nav).toBeTruthy()
    expect(formatCombo(nav!.combo, 'other')).toBe('Ctrl+Shift+K')
    expect(formatCombo(nav!.combo, 'mac')).toBe('Cmd+Shift+K')
    expect(combosEqual({ key: ' ', shift: false }, { key: ' ' })).toBe(true)
  })

  it('lists mode destinations that exist in that workspace', () => {
    expect(destinationIds('simple')).toContain('gain')
    expect(destinationIds('simple')).not.toContain('eq')
    expect(destinationIds('technical')).toEqual(expect.arrayContaining(['eq', 'automation', 'inspector', 'effects']))
    expect(destinationIds('sensory')).toContain('parameters')
    expect(destinationIds('sensory')).not.toContain('effects')
    expect(destinationIds('sensory')).not.toContain('export')
  })
})
