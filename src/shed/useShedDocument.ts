import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachPiece,
  deleteBranch,
  placeFoundation,
  replaceCatalog,
  type ConstructionIssueCode,
} from './construction/build'
import {
  addElement,
  bringForward,
  deleteElement,
  duplicateElement,
  editConstruction,
  moveElement,
  nudgeElement,
  resetElement,
  sendBackward,
  setBuildingTransparency,
  updateElement,
  type ElementPatch,
} from './commands'
import { isConstructionDocument, type AttachmentType, type ElementType, type OrnamentId } from './model'
import {
  beginConnectedBuild,
  hasLegacySheet,
  loadShedDocument,
  persistShedDocument,
  restoreFreeSheet,
  type ShedLoad,
  type ShedLoadStatus,
} from './persistence'

export function useShedDocument() {
  const [state, setState] = useState<ShedLoad>(() => loadShedDocument())
  const [notice, setNotice] = useState<ConstructionIssueCode | null>(null)
  const [legacy, setLegacy] = useState(() => hasLegacySheet())
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
      if (isConstructionDocument(documentRef.current)) {
        const result = editConstruction(documentRef.current, id, next)
        setNotice(result.error)
        replace(result.document)
        return
      }
      setNotice(null)
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
  const found = useCallback(
    (catalogId: string) => {
      const result = placeFoundation(documentRef.current, catalogId)
      setNotice(result.error)
      replace(result.document)
      return result.addedId
    },
    [replace],
  )
  const attach = useCallback(
    (parentId: string, direction: AttachmentType, catalogId: string) => {
      const result = attachPiece(documentRef.current, parentId, direction, catalogId)
      setNotice(result.error)
      replace(result.document)
      return result.addedId
    },
    [replace],
  )
  const removeBranch = useCallback(
    (id: string) => {
      const result = deleteBranch(documentRef.current, id)
      setNotice(result.error)
      replace(result.document)
    },
    [replace],
  )
  const chooseForm = useCallback(
    (id: string, catalogId: string) => {
      const result = replaceCatalog(documentRef.current, id, catalogId)
      setNotice(result.error)
      replace(result.document)
    },
    [replace],
  )
  const beginBuild = useCallback(() => {
    const next = beginConnectedBuild(documentRef.current)
    setLegacy(true)
    setNotice(null)
    replace(next)
  }, [replace])
  const restoreFree = useCallback(() => {
    const next = restoreFreeSheet(documentRef.current)
    setLegacy(hasLegacySheet())
    if (!next) return
    setNotice(null)
    replace(next)
  }, [replace])

  return {
    document: state.document,
    status: state.status,
    notice,
    clearNotice: () => setNotice(null),
    legacy,
    found,
    attach,
    removeBranch,
    chooseForm,
    beginBuild,
    restoreFree,
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
