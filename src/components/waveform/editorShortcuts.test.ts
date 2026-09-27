import { describe, expect, it } from 'vitest'
import { clipboardShortcut } from './editorShortcuts'

const base = {
  metaKey: false,
  ctrlKey: true,
  altKey: false,
  shiftKey: false,
  repeat: false,
  typing: false,
  textSelected: false,
  editorContext: true,
}

describe('clipboardShortcut', () => {
  it('maps copy, cut, and paste while the waveform editor is active', () => {
    expect(clipboardShortcut({ ...base, key: 'c' })).toBe('copy')
    expect(clipboardShortcut({ ...base, key: 'x', metaKey: true, ctrlKey: false })).toBe('cut')
    expect(clipboardShortcut({ ...base, key: 'v' })).toBe('paste')
  })

  it('ignores shortcuts while typing, outside the editor, or when text is selected', () => {
    expect(clipboardShortcut({ ...base, key: 'c', typing: true })).toBeNull()
    expect(clipboardShortcut({ ...base, key: 'v', editorContext: false })).toBeNull()
    expect(clipboardShortcut({ ...base, key: 'c', textSelected: true })).toBeNull()
    expect(clipboardShortcut({ ...base, key: 'x', textSelected: true })).toBeNull()
    expect(clipboardShortcut({ ...base, key: 'v', shiftKey: true })).toBeNull()
    expect(clipboardShortcut({ ...base, key: 'c', ctrlKey: false })).toBeNull()
  })
})
