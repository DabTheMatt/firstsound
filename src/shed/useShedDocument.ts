import { useCallback, useEffect, useRef, useState } from 'react'
import { addTower, changeLayer, moveElement, nudgeElement, resetElement, updateElement, type ElementPatch } from './commands'
import { loadShedDocument, persistShedDocument, type ShedLoad, type ShedLoadStatus } from './persistence'
import type { OrnamentId } from './model'

export function useShedDocument() {
  const [state, setState] = useState<ShedLoad>(() => loadShedDocument())
  const documentRef = useRef(state.document)
  const timerRef = useRef(0)

  useEffect(() => {
    documentRef.current = state.document
  }, [state.document])

  const flush = useCallback((next: ShedLoad['document']) => {
    persistShedDocument(next)
  }, [])

  const replace = useCallback(
    (next: ShedLoad['document'], status: ShedLoadStatus = 'saved') => {
      if (next === documentRef.current) return
      documentRef.current = next
      setState({ document: next, status })
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => flush(next), 120)
    },
    [flush],
  )

  useEffect(() => {
    const onHide = () => flush(documentRef.current)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.clearTimeout(timerRef.current)
      flush(documentRef.current)
    }
  }, [flush])

  return {
    document: state.document,
    status: state.status,
    move(id: string, x: number, y: number) {
      replace(moveElement(documentRef.current, id, x, y))
    },
    nudge(id: string, key: string, shiftKey: boolean) {
      replace(nudgeElement(documentRef.current, id, key, shiftKey))
    },
    patch(id: string, patch: ElementPatch) {
      replace(updateElement(documentRef.current, id, patch))
    },
    ornament(id: string, ornament: OrnamentId) {
      replace(updateElement(documentRef.current, id, { ornament }))
    },
    layer(id: string, delta: number) {
      replace(changeLayer(documentRef.current, id, delta))
    },
    reset(id: string) {
      replace(resetElement(documentRef.current, id))
    },
    add() {
      replace(addTower(documentRef.current))
    },
  }
}
