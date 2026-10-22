import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { focusInitial, trapTab } from '../a11y/dialogFocus'
import { getIntroState, setIntroPinned, subscribeIntro } from './session'
import { useIntroCopy } from './useIntroCopy'
import styles from './Intro.module.css'

type Props = {
  titleId: string
  describedBy?: string
  closeLabel: string
  wide?: boolean
  onClose: () => void
  overlay?: ReactNode
  /** Sits on the left of the top row, opposite the pin control. */
  leading?: ReactNode
  children: ReactNode
}

export function IntroDialog({ titleId, describedBy, closeLabel, wide = false, onClose, overlay = null, leading = null, children }: Props) {
  const copy = useIntroCopy()
  const pinned = useSyncExternalStore(subscribeIntro, () => getIntroState().pinned, () => false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)
  const [shift, setShift] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (pinned) return
    focusInitial(panelRef.current)
  }, [pinned])

  const drag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pinned || event.button !== 0) return
    event.preventDefault()
    const originX = event.clientX
    const originY = event.clientY
    const base = shift
    const move = (next: PointerEvent) => {
      if (Math.abs(next.clientX - originX) + Math.abs(next.clientY - originY) > 4) dragged.current = true
      setShift({ x: base.x + next.clientX - originX, y: base.y + next.clientY - originY })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className={`${styles.layer} ${pinned ? styles.layerPinned : ''}`}>
      {pinned ? null : (
        <button
          type="button"
          className={`${styles.scrim} ${overlay ? styles.scrimClear : ''}`}
          aria-label={closeLabel}
          onClick={onClose}
        />
      )}
      {pinned ? null : overlay}
      <div
        ref={panelRef}
        className={`${styles.panel} ${wide && !pinned ? styles.wide : ''} ${pinned ? styles.panelPinned : ''}`}
        role="dialog"
        aria-modal={pinned ? undefined : true}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        data-intro-dialog=""
        data-intro-pinned={pinned ? '' : undefined}
        style={pinned ? { transform: `translate(${shift.x}px, ${shift.y}px)` } : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            event.preventDefault()
            onClose()
            return
          }
          if (!pinned) trapTab(event)
        }}
      >
        <div className={styles.pinRow}>
          {leading ? <div className={styles.pinLead}>{leading}</div> : null}
          <button
            type="button"
            className={styles.pin}
            data-intro-pin=""
            aria-pressed={pinned}
            onPointerDown={drag}
            onClick={() => {
              if (dragged.current) {
                dragged.current = false
                return
              }
              setIntroPinned(!pinned)
            }}
          >
            {pinned ? copy.unpin : copy.pin}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
