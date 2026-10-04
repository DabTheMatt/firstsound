import { useEffect, useState, type RefObject } from 'react'

/** Pixel size of an element, updated when it is resized. */
export function useElementBox(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [box, setBox] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const read = () => {
      const width = Math.round(node.clientWidth)
      const height = Math.round(node.clientHeight)
      setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return box
}
