const triggers = new Map<string, HTMLElement>()

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function rememberTrigger(id: string, node: EventTarget | null = typeof document === 'undefined' ? null : document.activeElement): void {
  if (node instanceof HTMLElement) triggers.set(id, node)
}

export function peekTrigger(id: string): HTMLElement | null {
  return triggers.get(id) ?? null
}

export function restoreTrigger(id: string, fallbackSelector?: string): void {
  if (!triggers.has(id)) return
  const node = triggers.get(id) ?? null
  triggers.delete(id)
  queueMicrotask(() => {
    if (node?.isConnected) {
      node.focus()
      return
    }
    if (!fallbackSelector || typeof document === 'undefined') return
    document.querySelector<HTMLElement>(fallbackSelector)?.focus()
  })
}

export function focusSelector(selector: string): void {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(selector)?.focus()
  })
}

function visibleFocusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    if (el.closest('[hidden]')) return false
    return el.getClientRects().length > 0
  })
}

/** Moves focus to the dialog title, or the first visible control. */
export function focusInitial(container: ParentNode | null): void {
  if (!container) return
  const marked = container.querySelector<HTMLElement>('[data-dialog-initial]')
  if (marked) {
    marked.focus()
    return
  }
  if (container instanceof HTMLElement) visibleFocusable(container)[0]?.focus()
}

type TabEvent = {
  key: string
  shiftKey: boolean
  preventDefault(): void
  currentTarget: EventTarget | null
}

/** Keeps Tab inside an open dialog. Escape still closes it. */
export function trapTab(event: TabEvent): void {
  if (event.key !== 'Tab') return
  const root = event.currentTarget
  if (!(root instanceof HTMLElement)) return
  const items = visibleFocusable(root)
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault()
    last?.focus()
    return
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first?.focus()
  }
}
