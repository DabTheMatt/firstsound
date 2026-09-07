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

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return false
}

/** Space should activate the focused control, not steal transport. */
export function isTransportShortcutTarget(target: EventTarget | null): boolean {
  if (isTypingTarget(target)) return false
  if (!target || !(target instanceof Element)) return true
  return !target.closest(
    'button, a, [role="button"], [role="slider"], [role="switch"], [role="tab"], [role="radio"], [role="checkbox"], [role="menuitem"], [role="option"], [role="dialog"], [role="menu"], [role="listbox"], [contenteditable="true"]',
  )
}

export function scrollFocusedIntoView(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) return
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
