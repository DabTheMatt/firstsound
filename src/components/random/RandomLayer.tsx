import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import styles from './Random.module.css'

type Props = {
  anchorRef?: RefObject<HTMLElement | null>
  label: string
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

type Box = { top: number; left: number; width: number; maxHeight: number; sheet: boolean; bottom: number }

function viewport() {
  const visual = window.visualViewport
  return {
    top: visual?.offsetTop ?? 0,
    left: visual?.offsetLeft ?? 0,
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
  }
}

export function RandomLayer({ anchorRef, label, title, onClose, footer, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)

  useEffect(() => {
    const place = () => {
      const vp = viewport()
      const sheet = vp.width < 760
      const margin = 8
      if (sheet) {
        const maxHeight = Math.max(200, vp.height - 12)
        setBox({
          top: 0,
          left: vp.left,
          width: vp.width,
          maxHeight,
          sheet: true,
          bottom: Math.max(0, window.innerHeight - (vp.top + vp.height)),
        })
        return
      }
      const anchor = anchorRef?.current?.getBoundingClientRect()
      const width = Math.min(320, vp.width - margin * 2)
      const left = Math.max(vp.left + margin, Math.min(anchor?.left ?? vp.left + margin, vp.left + vp.width - width - margin))
      const below = anchor ? vp.top + vp.height - anchor.bottom - margin : vp.height / 2
      const above = anchor ? anchor.top - vp.top - margin : 0
      const openBelow = !anchor || below >= 200 || below >= above
      const maxHeight = Math.max(180, Math.min(vp.height - margin * 2, openBelow ? below : above))
      const top = !anchor
        ? vp.top + margin
        : openBelow
          ? Math.min(anchor.bottom + 6, vp.top + vp.height - maxHeight - margin)
          : Math.max(vp.top + margin, anchor.top - maxHeight - 6)
      setBox({ top, left, width, maxHeight, sheet: false, bottom: 0 })
    }
    place()
    const visual = window.visualViewport
    visual?.addEventListener('resize', place)
    visual?.addEventListener('scroll', place)
    window.addEventListener('resize', place)
    return () => {
      visual?.removeEventListener('resize', place)
      visual?.removeEventListener('scroll', place)
      window.removeEventListener('resize', place)
    }
  }, [anchorRef])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || anchorRef?.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, onClose])

  if (!box) return null
  return (
    <>
      {box.sheet ? <button type="button" className={styles.scrim} aria-label="Close" onClick={onClose} /> : null}
      <div
        ref={panelRef}
        className={box.sheet ? `${styles.frame} ${styles.sheetFrame}` : styles.frame}
        style={
          box.sheet
            ? { left: box.left, width: box.width, bottom: box.bottom, maxHeight: box.maxHeight }
            : { top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }
        }
        role="dialog"
        aria-label={label}
      >
        <header className={styles.frameHead}>
          <h2 className={styles.title}>{title}</h2>
        </header>
        <div className={styles.frameBody}>{children}</div>
        {footer ? <footer className={styles.frameFoot}>{footer}</footer> : null}
      </div>
    </>
  )
}
