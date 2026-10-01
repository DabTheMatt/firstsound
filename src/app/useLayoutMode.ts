import { useEffect, useState } from 'react'
import { appViewportHeightPx, resolveLayoutMode, type LayoutMode } from './layoutMode'

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
  const [box, setBox] = useState(() =>
    typeof window === 'undefined'
      ? { width: 1280, height: 800 }
      : readBox(),
  )

  useEffect(() => {
    const update = () => {
      const next = readBox()
      setBox((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])

  return { mode: resolveLayoutMode(box), width: box.width, height: box.height }
}