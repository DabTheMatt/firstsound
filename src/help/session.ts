import { announce } from '../a11y/liveRegion'
import { helpChrome } from './chrome'
import { localeFromDocument } from './level'
import { resolveHelp } from './resolve'

export type ExplainRequest = {
  id: string
  anchor: HTMLElement
}

type Listener = () => void

let session: ExplainRequest | null = null
let remembered: ExplainRequest | null = null
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getExplainSession(): ExplainRequest | null {
  return session
}

export function subscribeExplain(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function rememberExplainTarget(id: string, anchor: HTMLElement): void {
  remembered = { id, anchor }
}

export function rememberedExplainId(scope: Element | null): string | null {
  if (!remembered || !scope) return null
  if (!remembered.anchor.isConnected) return null
  if (!scope.contains(remembered.anchor)) return null
  if (remembered.anchor.hasAttribute('data-explain-mark')) return null
  return remembered.id
}

export function openExplain(id: string, anchor: HTMLElement): boolean {
  const locale = localeFromDocument(typeof document === 'undefined' ? 'en' : document.documentElement.lang)
  const help = resolveHelp(id, locale)
  if (!help) {
    announce(helpChrome(locale).missing)
    return false
  }
  session = { id, anchor }
  emit()
  announce(helpChrome(locale).opened(help.title, help.summary))
  return true
}

export function closeExplain(): void {
  if (!session) return
  const anchor = session.anchor
  const returnFocus = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement && document.activeElement.closest('[data-explain-popover]')
  session = null
  emit()
  if (returnFocus && anchor.isConnected) anchor.focus()
}
