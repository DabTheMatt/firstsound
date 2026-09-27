const ARROW_ROLES = new Set([
  'slider',
  'spinbutton',
  'combobox',
  'listbox',
  'option',
  'tab',
  'radio',
  'radiogroup',
  'menuitem',
  'menuitemradio',
  'menuitemcheckbox',
  'scrollbar',
  'tree',
  'treeitem',
  'grid',
  'gridcell',
  'textbox',
])

const EMBEDDED_ARROW_CONTROL =
  '[data-auto-node],[data-auto-tension],[data-auto-segment],[data-curve-switch],[data-knob],[data-arrow-keys]'

export type ArrowKeyOwner = {
  tagName: string
  role: string | null
  editable: boolean
  embeddedArrowControl: boolean
}

/** True when the focused control already uses arrow keys for its own editing. */
export function arrowKeyOwnerClaimsKeys(owner: ArrowKeyOwner): boolean {
  if (owner.editable || owner.embeddedArrowControl) return true
  const tag = owner.tagName.toUpperCase()
  if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'BUTTON') return true
  if (owner.role && ARROW_ROLES.has(owner.role)) return true
  return false
}

export function arrowKeyOwnerFromTarget(target: EventTarget | null): ArrowKeyOwner | null {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return null
  return {
    tagName: target.tagName,
    role: target.getAttribute('role'),
    editable: target instanceof HTMLElement && target.isContentEditable,
    embeddedArrowControl: target.closest(EMBEDDED_ARROW_CONTROL) != null,
  }
}

export function blocksPlayheadArrowKey(target: EventTarget | null): boolean {
  const owner = arrowKeyOwnerFromTarget(target)
  if (!owner) return false
  return arrowKeyOwnerClaimsKeys(owner)
}
