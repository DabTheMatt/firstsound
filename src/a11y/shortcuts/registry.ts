export type ShortcutScope =
  | 'global'
  | 'waveform'
  | 'transport'
  | 'effect-chain'
  | 'inspector'
  | 'eq'
  | 'automation'
  | 'guided-tasks'
  | 'modal'

export type ShortcutGroup = 'navigation' | 'transport' | 'editing' | 'effects' | 'automation' | 'guidedTasks'

export type ShortcutCombo = {
  key: string
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

export type ShortcutDef = {
  id: string
  group: ShortcutGroup
  scope: ShortcutScope
  combo: ShortcutCombo
  /** Global listener runs it. Local shortcuts stay on the widget that already owns them. */
  dispatch: 'global' | 'local'
}

/**
 * One registry. Ctrl/Cmd+K is left to the browser address bar.
 * Workspace navigation uses Ctrl/Cmd+Shift+K.
 */
export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: 'nav.workspaces', group: 'navigation', scope: 'global', combo: { key: 'k', mod: true, shift: true }, dispatch: 'global' },
  { id: 'nav.help', group: 'navigation', scope: 'global', combo: { key: '/', mod: true, shift: true }, dispatch: 'global' },
  { id: 'transport.play', group: 'transport', scope: 'global', combo: { key: ' ' }, dispatch: 'global' },
  { id: 'transport.stop', group: 'transport', scope: 'global', combo: { key: '.', mod: true, shift: true }, dispatch: 'global' },
  { id: 'transport.loop', group: 'transport', scope: 'global', combo: { key: 'l', mod: true, shift: true }, dispatch: 'global' },
  { id: 'transport.back', group: 'transport', scope: 'waveform', combo: { key: 'ArrowLeft' }, dispatch: 'local' },
  { id: 'transport.forward', group: 'transport', scope: 'waveform', combo: { key: 'ArrowRight' }, dispatch: 'local' },
  { id: 'transport.backCoarse', group: 'transport', scope: 'waveform', combo: { key: 'ArrowLeft', shift: true }, dispatch: 'local' },
  { id: 'transport.forwardCoarse', group: 'transport', scope: 'waveform', combo: { key: 'ArrowRight', shift: true }, dispatch: 'local' },
  { id: 'transport.toStart', group: 'transport', scope: 'waveform', combo: { key: 'Home' }, dispatch: 'local' },
  { id: 'transport.toEnd', group: 'transport', scope: 'waveform', combo: { key: 'End' }, dispatch: 'local' },
  { id: 'transport.pageBack', group: 'transport', scope: 'waveform', combo: { key: 'PageUp' }, dispatch: 'local' },
  { id: 'transport.pageForward', group: 'transport', scope: 'waveform', combo: { key: 'PageDown' }, dispatch: 'local' },
  { id: 'edit.undo', group: 'editing', scope: 'global', combo: { key: 'z', mod: true }, dispatch: 'global' },
  { id: 'edit.redo', group: 'editing', scope: 'global', combo: { key: 'z', mod: true, shift: true }, dispatch: 'global' },
  { id: 'edit.redoY', group: 'editing', scope: 'global', combo: { key: 'y', mod: true }, dispatch: 'global' },
  { id: 'edit.copy', group: 'editing', scope: 'waveform', combo: { key: 'c', mod: true }, dispatch: 'local' },
  { id: 'edit.cut', group: 'editing', scope: 'waveform', combo: { key: 'x', mod: true }, dispatch: 'local' },
  { id: 'edit.paste', group: 'editing', scope: 'waveform', combo: { key: 'v', mod: true }, dispatch: 'local' },
  { id: 'markers.add', group: 'editing', scope: 'global', combo: { key: 'e', mod: true, shift: true }, dispatch: 'global' },
  { id: 'markers.previous', group: 'editing', scope: 'global', combo: { key: 'ArrowUp', mod: true, shift: true }, dispatch: 'global' },
  { id: 'markers.next', group: 'editing', scope: 'global', combo: { key: 'ArrowDown', mod: true, shift: true }, dispatch: 'global' },
  { id: 'markers.open', group: 'editing', scope: 'global', combo: { key: 'u', mod: true, shift: true }, dispatch: 'global' },
  { id: 'effects.earlier', group: 'effects', scope: 'effect-chain', combo: { key: 'ArrowLeft', alt: true }, dispatch: 'local' },
  { id: 'effects.later', group: 'effects', scope: 'effect-chain', combo: { key: 'ArrowRight', alt: true }, dispatch: 'local' },
  { id: 'effects.up', group: 'effects', scope: 'effect-chain', combo: { key: 'ArrowUp', alt: true }, dispatch: 'local' },
  { id: 'effects.down', group: 'effects', scope: 'effect-chain', combo: { key: 'ArrowDown', alt: true }, dispatch: 'local' },
  { id: 'auto.delete', group: 'automation', scope: 'automation', combo: { key: 'Delete' }, dispatch: 'local' },
  { id: 'guide.minimize', group: 'guidedTasks', scope: 'guided-tasks', combo: { key: 'Escape' }, dispatch: 'local' },
  { id: 'modal.close', group: 'navigation', scope: 'modal', combo: { key: 'Escape' }, dispatch: 'local' },
]

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  'navigation',
  'transport',
  'editing',
  'effects',
  'automation',
  'guidedTasks',
]

export type KeyEventLike = {
  key: string
  code?: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  isComposing?: boolean
}

export function normalizeShortcutKey(event: KeyEventLike): string {
  if (event.key === '?' || event.code === 'Slash') return event.key === '?' ? '/' : event.key === '/' ? '/' : event.key.toLowerCase()
  if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar') return ' '
  if (event.key.length === 1) return event.key.toLowerCase()
  return event.key
}

export function comboFromEvent(event: KeyEventLike): ShortcutCombo | null {
  if (event.isComposing || event.key === 'Process') return null
  const key = event.key === '?' ? '/' : normalizeShortcutKey(event)
  return {
    key,
    mod: event.metaKey || event.ctrlKey,
    shift: event.shiftKey || event.key === '?',
    alt: event.altKey,
  }
}

export function combosEqual(a: ShortcutCombo, b: ShortcutCombo): boolean {
  return a.key === b.key && Boolean(a.mod) === Boolean(b.mod) && Boolean(a.shift) === Boolean(b.shift) && Boolean(a.alt) === Boolean(b.alt)
}

function scopesOverlap(a: ShortcutScope, b: ShortcutScope): boolean {
  if (a === b) return true
  if (a === 'global' || b === 'global') return true
  return false
}

export function shortcutConflicts(defs: readonly ShortcutDef[] = SHORTCUTS): Array<[string, string]> {
  const hits: Array<[string, string]> = []
  for (let i = 0; i < defs.length; i += 1) {
    for (let j = i + 1; j < defs.length; j += 1) {
      const left = defs[i]
      const right = defs[j]
      if (!left || !right) continue
      if (!combosEqual(left.combo, right.combo)) continue
      if (!scopesOverlap(left.scope, right.scope)) continue
      hits.push([left.id, right.id])
    }
  }
  return hits
}

export function matchShortcut(event: KeyEventLike, defs: readonly ShortcutDef[] = SHORTCUTS): ShortcutDef | null {
  const combo = comboFromEvent(event)
  if (!combo) return null
  return defs.find((item) => item.dispatch === 'global' && combosEqual(item.combo, combo)) ?? null
}

const KEY_LABEL: Record<string, string> = {
  ' ': 'Space',
  ArrowLeft: 'Arrow Left',
  ArrowRight: 'Arrow Right',
  ArrowUp: 'Arrow Up',
  ArrowDown: 'Arrow Down',
  Escape: 'Escape',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  '.': '.',
  '/': '/',
}

export function formatCombo(combo: ShortcutCombo, platform: 'mac' | 'other'): string {
  const parts: string[] = []
  if (combo.mod) parts.push(platform === 'mac' ? 'Cmd' : 'Ctrl')
  if (combo.alt) parts.push('Alt')
  if (combo.shift) parts.push('Shift')
  parts.push(KEY_LABEL[combo.key] ?? combo.key.toUpperCase())
  return parts.join('+')
}

export function shortcutPlatform(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): 'mac' | 'other' {
  return /Mac|iPhone|iPad/.test(userAgent) ? 'mac' : 'other'
}
