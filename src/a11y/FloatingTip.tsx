import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { placeFloatingTip } from './floatingTip'
import styles from './FloatingTip.module.css'

type Props = {
  anchorRef: RefObject<HTMLElement | null>
  text: string
}

/** Tooltip on the document, so a scrolling or clipped panel cannot cut it off. */
export function FloatingTip({ anchorRef, text }: Props) {
  const tipRef = useRef<HTMLSpanElement>(null)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const anchor = anchorRef.current
      const tip = tipRef.current
      if (!anchor || !tip) return
      setBox(
        placeFloatingTip(anchor.getBoundingClientRect(), tip.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef, text])

  if (typeof document === 'undefined') return null
  return createPortal(
    <span
      ref={tipRef}
      className={styles.tip}
      role="tooltip"
      style={box ? { top: box.top, left: box.left } : undefined}
      data-placed={box ? 'true' : 'false'}
    >
      {text}
    </span>,
    document.body,
  )
}
