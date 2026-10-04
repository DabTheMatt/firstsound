/**
 * Transient pointer ownership.
 *
 * Drag cursors live on the document (`data-chain-drag`), on the wave overlay
 * (`data-cursor`), and on whichever element called `setPointerCapture`. None of
 * that is session state. Reset and a fresh load must drop it, or the browser
 * keeps the last grabbing / resize / fade cursor.
 *
 * Drag flags are not written to storage. Reload starts from a clean document;
 * `clearPointerInteraction` also runs once on mount in case a reload interrupted
 * a capture.
 */

type ResetListener = () => void

type CaptureRecord = {
  element: Element
  pointerId: number
}

const listeners = new Set<ResetListener>()
const captures = new Set<CaptureRecord>()
let installed = false
let epoch = 0

function dropCapture(element: EventTarget | null, pointerId: number): void {
  for (const record of captures) {
    if (record.pointerId === pointerId && (element == null || record.element === element)) {
      captures.delete(record)
    }
  }
}

/** Register `setPointerCapture` so Reset can release it. Safe to call more than once. */
export function installPointerSession(doc: Document | undefined = globalThis.document): void {
  if (installed || typeof Element === 'undefined') return
  installed = true
  const proto = Element.prototype
  const setCapture = proto.setPointerCapture
  const releaseCapture = proto.releasePointerCapture
  proto.setPointerCapture = function (this: Element, pointerId: number) {
    captures.add({ element: this, pointerId })
    return setCapture.call(this, pointerId)
  }
  proto.releasePointerCapture = function (this: Element, pointerId: number) {
    dropCapture(this, pointerId)
    return releaseCapture.call(this, pointerId)
  }
  doc?.addEventListener(
    'lostpointercapture',
    (event) => {
      dropCapture(event.target, event.pointerId)
    },
    true,
  )
}

export function pointerEpoch(): number {
  return epoch
}

/** Components clear their own drag flags here. Returns an unsubscribe. */
export function onPointerReset(listener: ResetListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function pinDefaultCursor(doc: Document): void {
  const root = doc.documentElement
  const body = doc.body
  if (root?.style) root.style.cursor = 'default'
  if (body?.style) body.style.cursor = 'default'
  const release = () => {
    root?.style?.removeProperty('cursor')
    body?.style?.removeProperty('cursor')
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(release))
  }
  doc.addEventListener?.('pointerup', release, { once: true })
  doc.addEventListener?.('pointercancel', release, { once: true })
}

/**
 * Release captures, drop drag cursors, and tell widgets to forget the gesture.
 * Does not touch parameters or the audio graph.
 */
export function clearPointerInteraction(doc: Document | undefined = globalThis.document): void {
  epoch += 1
  installPointerSession(doc)
  const pending = [...captures]
  captures.clear()
  for (const record of pending) {
    try {
      record.element.releasePointerCapture(record.pointerId)
    } catch {
      /* capture already ended */
    }
  }
  if (doc) {
    delete doc.documentElement?.dataset?.chainDrag
    const clearMarker = (node: Element, key: 'cursor' | 'gesture') => {
      const host = node as Element & { dataset?: Record<string, string | undefined> }
      if (host.dataset) delete host.dataset[key]
    }
    doc.querySelectorAll?.('[data-cursor]').forEach((node) => clearMarker(node, 'cursor'))
    doc.querySelectorAll?.('[data-gesture]').forEach((node) => clearMarker(node, 'gesture'))
    pinDefaultCursor(doc)
  }
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      /* one widget must not block the others */
    }
  }
}
