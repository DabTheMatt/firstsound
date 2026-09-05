import { useEffect, useState } from 'react'
import { isStandaloneDisplay } from './displayMode'

const DISPLAY_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
] as const

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return isStandaloneDisplay(nav, (query) => window.matchMedia(query))
}

export function useStandaloneDisplay(): boolean {
  const [standalone, setStandalone] = useState(readStandalone)

  useEffect(() => {
    const lists = DISPLAY_QUERIES.map((query) => window.matchMedia(query))
    const onChange = () => setStandalone(readStandalone())
    for (const list of lists) {
      list.addEventListener('change', onChange)
    }
    onChange()
    return () => {
      for (const list of lists) {
        list.removeEventListener('change', onChange)
      }
    }
  }, [])

  return standalone
}
