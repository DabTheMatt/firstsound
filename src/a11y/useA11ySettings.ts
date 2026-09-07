import { useEffect, useState } from 'react'
import {
  applyA11yDom,
  persistA11ySettings,
  readStoredA11ySettings,
  type A11ySettings,
} from './settings'

const CHANGE = 'field-a11y-change'

export function subscribeA11y(onChange: () => void): () => void {
  const handler = () => onChange()
  document.addEventListener(CHANGE, handler)
  return () => document.removeEventListener(CHANGE, handler)
}

export function getA11ySettings(): A11ySettings {
  return readStoredA11ySettings()
}

export function persistAndApplyA11y(next: A11ySettings): A11ySettings {
  persistA11ySettings(next)
  applyA11yDom(next)
  document.dispatchEvent(new CustomEvent(CHANGE))
  return next
}

export function bootstrapA11y(): A11ySettings {
  const settings = readStoredA11ySettings()
  applyA11yDom(settings)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => applyA11yDom(readStoredA11ySettings())
    mq.addEventListener('change', onMotion)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('focusin', (event) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    })
  }
  return settings
}

export function useA11ySettings(): {
  settings: A11ySettings
  setSettings: (patch: Partial<A11ySettings>) => void
} {
  const [settings, setState] = useState<A11ySettings>(() => readStoredA11ySettings())
  useEffect(() => subscribeA11y(() => setState(readStoredA11ySettings())), [])
  const setSettings = (patch: Partial<A11ySettings>) => {
    setState(persistAndApplyA11y({ ...readStoredA11ySettings(), ...patch }))
  }
  return { settings, setSettings }
}
