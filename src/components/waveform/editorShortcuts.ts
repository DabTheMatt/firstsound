import { isTypingFromTag } from '../../a11y/keyboard'

export type ClipboardShortcut = 'copy' | 'cut' | 'paste'

const TEXT_FIELD = 'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"]'

/** True while the user is editing text, including fields nested under the event target. */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  const field = target.closest(TEXT_FIELD)
  if (!field) return false
  if (field instanceof HTMLInputElement) return isTypingFromTag(field.tagName, field.type, false)
  return true
}

/** Waveform surface or its edit toolbar, not the rest of the instrument. */
export function isWaveformEditorContext(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  return target.closest('[data-waveform-editor],[data-waveform-toolbar]') != null
}

export function hasUserTextSelection(): boolean {
  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return false
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return false
  return selection.toString().length > 0
}

export function clipboardShortcut(input: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  typing: boolean
  textSelected: boolean
  editorContext: boolean
}): ClipboardShortcut | null {
  if (!input.editorContext || input.typing || input.repeat || input.altKey || input.shiftKey) return null
  if (!input.metaKey && !input.ctrlKey) return null
  const key = input.key.toLowerCase()
  if (key === 'c') return input.textSelected ? null : 'copy'
  if (key === 'x') return input.textSelected ? null : 'cut'
  if (key === 'v') return 'paste'
  return null
}
