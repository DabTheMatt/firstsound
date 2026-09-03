import { useEffect, useState } from 'react'
import { appViewportHeightPx, resolveLayoutMode, type LayoutMode } from './layoutMode'

function readBox() {
  const visual = window.visualViewport?.height
  const client = document.documentElement.clientHeight
  const height = appViewportHeightPx(window.innerHeight, visual, client)
  document.documentElement.style.setProperty('--app-height', `${height}px`)
  return { width: window.innerWidth, height }
}

export function useLayoutMode(): { mode: LayoutMode; width: number; height: number } {
  const [box, setBox] = useState(() =>
    typeof window === 'undefined'
      ? { width: 1280, height: 800 }
      : readBox(),
  )

  useEffect(() => {
    const update = () => setBox(readBox())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  return { mode: resolveLayoutMode(box), width: box.width, height: box.height }
}