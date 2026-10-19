import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addElement,
  bringForward,
  deleteElement,
  duplicateElement,
  moveElement,
  nudgeElement,
  resetElement,
  sendBackward,
  setBuildingTransparency,
  updateElement,
  type ElementPatch,
} from './commands'
import type { ElementType, OrnamentId } from './model'
import { loadShedDocument, persistShedDocument, type ShedLoad, type ShedLoadStatus } from './persistence'

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

  const move = useCallback(
    (id: string, x: number, y: number) => {
      replace(moveElement(documentRef.current, id, x, y))
    },
    [replace],
  )
  const nudge = useCallback(
    (id: string, key: string, shiftKey: boolean) => {
      replace(nudgeElement(documentRef.current, id, key, shiftKey))
    },
    [replace],
  )
  const patch = useCallback(
    (id: string, next: ElementPatch) => {
      replace(updateElement(documentRef.current, id, next))
    },
    [replace],
  )
  const ornament = useCallback(
    (id: string, ornamentId: OrnamentId) => {
      replace(updateElement(documentRef.current, id, { ornament: ornamentId }))
    },
    [replace],
  )
  const forward = useCallback(
    (id: string) => {
      replace(bringForward(documentRef.current, id))
    },
    [replace],
  )
  const backward = useCallback(
    (id: string) => {
      replace(sendBackward(documentRef.current, id))
    },
    [replace],
  )
  const reset = useCallback(
    (id: string) => {
      replace(resetElement(documentRef.current, id))
    },
    [replace],
  )
  const add = useCallback(
    (type: ElementType = 'tower') => {
      replace(addElement(documentRef.current, type))
    },
    [replace],
  )
  const remove = useCallback(
    (id: string) => {
      replace(deleteElement(documentRef.current, id))
    },
    [replace],
  )
  const setTransparency = useCallback(
    (transparent: boolean) => {
      replace(setBuildingTransparency(documentRef.current, transparent))
    },
    [replace],
  )
  const duplicate = useCallback(
    (id: string) => {
      const before = new Set(documentRef.current.scene.elements.map((element) => element.id))
      const next = duplicateElement(documentRef.current, id)
      replace(next)
      return next.scene.elements.find((element) => !before.has(element.id))?.id ?? null
    },
    [replace],
  )

  return {
    document: state.document,
    status: state.status,
    move,
    nudge,
    patch,
    ornament,
    forward,
    backward,
    reset,
    add,
    remove,
    duplicate,
    setTransparency,
  }
}
