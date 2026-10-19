import { useCallback, useEffect, useRef, useState } from 'react'
import { placeBuilding, removeBuilding, selectAuthor } from './commands'
import type { CityBuildingType } from './model'
import { loadCityDocument, persistCityDocument, type CityLoad, type CityLoadStatus } from './persistence'

export function useCityDocument() {
  const [state, setState] = useState<CityLoad>(() => loadCityDocument())
  const documentRef = useRef(state.document)
  const timerRef = useRef(0)

  useEffect(() => {
    documentRef.current = state.document
  }, [state.document])

  const flush = useCallback((next: CityLoad['document']) => {
    persistCityDocument(next)
  }, [])

  const replace = useCallback(
    (next: CityLoad['document'], status: CityLoadStatus = 'saved') => {
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

  const place = useCallback(
    (plotId: string, type: CityBuildingType) => {
      replace(placeBuilding(documentRef.current, plotId, type))
    },
    [replace],
  )
  const release = useCallback(
    (plotId: string) => {
      replace(removeBuilding(documentRef.current, plotId))
    },
    [replace],
  )
  const setAuthor = useCallback(
    (authorId: string) => {
      replace(selectAuthor(documentRef.current, authorId))
    },
    [replace],
  )

  return {
    document: state.document,
    status: state.status,
    place,
    release,
    setAuthor,
  }
}
