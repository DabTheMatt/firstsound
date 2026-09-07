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

/** Space always toggles play/pause unless the user is typing in a text field. */
export function isTransportShortcutTarget(target: EventTarget | null): boolean {
  return !isTypingTarget(target)
}

export function scrollFocusedIntoView(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) return
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
