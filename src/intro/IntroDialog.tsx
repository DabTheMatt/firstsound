import { useEffect, useRef, type ReactNode } from 'react'
import { focusInitial, trapTab } from '../a11y/dialogFocus'
import styles from './Intro.module.css'

type Props = {
  titleId: string
  describedBy?: string
  closeLabel: string
  wide?: boolean
  onClose: () => void
  overlay?: ReactNode
  children: ReactNode
}

export function IntroDialog({ titleId, describedBy, closeLabel, wide = false, onClose, overlay = null, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    focusInitial(panelRef.current)
  }, [])

  return (
    <div className={styles.layer}>
      <button
        type="button"
        className={`${styles.scrim} ${overlay ? styles.scrimClear : ''}`}
        aria-label={closeLabel}
        onClick={onClose}
      />
      {overlay}
      <div
        ref={panelRef}
        className={`${styles.panel} ${wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        data-intro-dialog=""
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            event.preventDefault()
            onClose()
            return
          }
          trapTab(event)
        }}
      >
        {children}
      </div>
    </div>
  )
}
