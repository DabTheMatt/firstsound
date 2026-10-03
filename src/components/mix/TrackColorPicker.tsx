import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TRACK_COLOR_IDS, trackColorVar, type TrackColorId } from '../../audio/mix/tracks'
import styles from './TrackColorPicker.module.css'

type Props = {
  anchor: HTMLElement | null
  value: TrackColorId
  label: string
  onPick: (color: TrackColorId) => void
  onClose: () => void
}

const MENU_WIDTH = 148
const MENU_HEIGHT = 44

/**
 * Track color is an overlay. It is not a document-flow sibling of the waveform,
 * so opening it cannot change lane height, scroll, or transport position.
 */
export function TrackColorPicker({ anchor, value, label, onPick, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const margin = 8
      let left = rect.left
      if (left + MENU_WIDTH > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - MENU_WIDTH - margin)
      let top = rect.bottom + 6
      if (top + MENU_HEIGHT > window.innerHeight - margin) top = Math.max(margin, rect.top - MENU_HEIGHT - 6)
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (node && (anchor?.contains(node) || menuRef.current?.contains(node))) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  if (!pos || !anchor) return null
  return createPortal(
    <div
      ref={menuRef}
      className={styles.menu}
      role="listbox"
      aria-label={label}
      data-track-color-popover=""
      style={{ top: pos.top, left: pos.left }}
    >
      {TRACK_COLOR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="option"
          className={styles.swatch}
          aria-selected={id === value}
          aria-label={id}
          style={{ background: trackColorVar(id) }}
          onClick={() => onPick(id)}
        />
      ))}
    </div>,
    document.body,
  )
}
