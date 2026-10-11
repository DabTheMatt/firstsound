import { useEffect, useRef, useState } from 'react'
import { LAYOUT_HYSTERESIS_PX, layoutStabilized } from '../a11y/predictableLayout'
import { appViewportHeightPx, resolveLayoutModeStable, type LayoutMode } from './layoutMode'

function readBox() {
  const viewport = window.visualViewport
  const visual = viewport?.height
  const client = document.documentElement.clientHeight
  const height = appViewportHeightPx(window.innerHeight, visual, client)
  const offset = viewport && viewport.offsetTop > 0 ? Math.round(viewport.offsetTop) : 0
  const root = document.documentElement
  const heightValue = `${height}px`
  const offsetValue = `${offset}px`
  if (root.style.getPropertyValue('--app-height') !== heightValue) {
    root.style.setProperty('--app-height', heightValue)
  }
  if (root.style.getPropertyValue('--vv-offset-top') !== offsetValue) {
    root.style.setProperty('--vv-offset-top', offsetValue)
  }
  return { width: window.innerWidth, height }
}

export function useLayoutMode(): { mode: LayoutMode; width: number; height: number } {
  const previous = useRef<LayoutMode | null>(null)
  const [box, setBox] = useState(() => {
    const size = typeof window === 'undefined' ? { width: 1280, height: 800 } : readBox()
    return { ...size, mode: resolveLayoutModeStable(size, null, false) }
  })

  useEffect(() => {
    const update = () => {
      const next = readBox()
      const mode = resolveLayoutModeStable(next, previous.current, layoutStabilized(), LAYOUT_HYSTERESIS_PX)
      previous.current = mode
      setBox((prev) =>
        prev.width === next.width && prev.height === next.height && prev.mode === mode
          ? prev
          : { width: next.width, height: next.height, mode },
      )
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    document.addEventListener('field-a11y-change', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      document.removeEventListener('field-a11y-change', update)
    }
  }, [])

  return { mode: box.mode, width: box.width, height: box.height }
}