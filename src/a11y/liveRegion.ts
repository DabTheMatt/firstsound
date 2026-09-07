const CHANGE = 'field-a11y-announce'

export function announce(message: string): void {
  if (!message.trim()) return
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent(CHANGE, { detail: { message } }))
}

export function subscribeAnnounce(onMessage: (message: string) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ message: string }>).detail
    if (detail?.message) onMessage(detail.message)
  }
  document.addEventListener(CHANGE, handler)
  return () => document.removeEventListener(CHANGE, handler)
}
