export type SliderKeyResult = { kind: 'value'; normalized: number } | { kind: 'reset' } | null

export function sliderStepForKey(
  key: string,
  shiftKey: boolean,
  options?: { step?: number; fine?: number; page?: number },
): number | null {
  const step = options?.step ?? 0.02
  const fine = options?.fine ?? 0.004
  const page = options?.page ?? 0.12
  const delta = shiftKey ? fine : step
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return delta
    case 'ArrowDown':
    case 'ArrowLeft':
      return -delta
    case 'PageUp':
      return page
    case 'PageDown':
      return -page
    default:
      return null
  }
}

export function applySliderKey(
  event: { key: string; shiftKey: boolean },
  normalized: number,
  options?: { step?: number; fine?: number; page?: number },
): SliderKeyResult {
  if (event.key === 'Home') return { kind: 'value', normalized: 0 }
  if (event.key === 'End') return { kind: 'value', normalized: 1 }
  if (event.key === 'Delete' || event.key === 'Backspace') return { kind: 'reset' }
  const delta = sliderStepForKey(event.key, event.shiftKey, options)
  if (delta == null) return null
  return { kind: 'value', normalized: Math.min(1, Math.max(0, normalized + delta)) }
}

const TEXTISH_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'password',
  'url',
  'tel',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
])

export function isSpaceKey(event: { code?: string; key?: string }): boolean {
  return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar'
}

/** Drops the extra click browsers fire when Space activates a focused button. */
export function createSpaceActivationGuard() {
  let armed = false
  let clearTimer = 0
  return {
    arm() {
      armed = true
      if (clearTimer) window.clearTimeout(clearTimer)
      clearTimer = window.setTimeout(() => {
        armed = false
        clearTimer = 0
      }, 50)
    },
    onClick(event: Event) {
      if (!armed) return false
      armed = false
      if (clearTimer) {
        window.clearTimeout(clearTimer)
        clearTimer = 0
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      return true
    },
  }
}

/** True when Space should insert a character instead of toggling transport. */
export function isTypingFromTag(tagName: string, inputType = '', isContentEditable = false): boolean {
  if (isContentEditable) return true
  const tag = tagName.toUpperCase()
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') return TEXTISH_INPUT_TYPES.has(inputType.toLowerCase())
  return false
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const type = target instanceof HTMLInputElement ? target.type : ''
  return isTypingFromTag(target.tagName, type, target.isContentEditable)
}

const SPACE_OWNING_ROLES = new Set([
  'checkbox',
  'radio',
  'switch',
  'menuitemcheckbox',
  'menuitemradio',
])

/**
 * Space is the activation key for these controls, and dialogs keep Space
 * for their own widgets. Transport must not steal it.
 */
export function transportSpaceSuppressed(input: {
  tagName: string
  inputType?: string
  role?: string | null
  editable?: boolean
  inDialog?: boolean
}): boolean {
  if (input.inDialog) return true
  if (isTypingFromTag(input.tagName, input.inputType ?? '', input.editable ?? false)) return true
  const tag = input.tagName.toUpperCase()
  if (tag === 'SELECT' || tag === 'SUMMARY') return true
  const type = (input.inputType ?? '').toLowerCase()
  if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio')) return true
  if (input.role && SPACE_OWNING_ROLES.has(input.role)) return true
  return false
}

/** Space toggles play/pause except while typing, on a checkbox or radio, or inside a dialog. */
export function isTransportShortcutTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return !isTypingTarget(target)
  const inDialog = Boolean(target.closest('[role="dialog"], [role="alertdialog"], [role="menu"]'))
  return !transportSpaceSuppressed({
    tagName: target.tagName,
    inputType: target instanceof HTMLInputElement ? target.type : '',
    role: target.getAttribute('role'),
    editable: target.isContentEditable,
    inDialog,
  })
}

export function scrollFocusedIntoView(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) return
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
