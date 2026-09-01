import { useEffect, useState } from 'react'
import { resolveLayoutMode, type LayoutMode } from './layoutMode'

export function useLayoutMode(): { mode: LayoutMode; width: number; height: number } {
  const [box, setBox] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }))

  useEffect(() => {
    const update = () => setBox({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return { mode: resolveLayoutMode(box), width: box.width, height: box.height }
}