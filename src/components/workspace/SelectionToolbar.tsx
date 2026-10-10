import { useEffect, useId, useRef, useState } from 'react'
import { guideTargetAttrs, guideTargetForAction } from '../../guide/targets'
import { useI18n } from '../../i18n'
import styles from './Workspace.module.css'

type Action = {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}

type Props = {
  selected: boolean
  zoomLabel: string
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  primary: Action[]
  more: Action[]
}

/** Selection-aware edit commands. Shortcuts stay on the existing key handlers. */
export function SelectionToolbar({ selected, zoomLabel, onZoomIn, onZoomOut, onFit, primary, more }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const openMore = () => setOpen(true)
    window.addEventListener('field-guide-open-more', openMore)
    return () => window.removeEventListener('field-guide-open-more', openMore)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.editBar} ref={rootRef} data-selection-toolbar={selected ? 'selection' : 'wave'}>
      <button type="button" className={styles.textButton} onClick={onZoomOut} aria-label={t.waveform.zoomOut}>
        −
      </button>
      <span className={styles.zoom}>{zoomLabel}</span>
      <button type="button" className={styles.textButton} onClick={onZoomIn} aria-label={t.waveform.zoomIn}>
        +
      </button>
      <button type="button" className={styles.textButton} onClick={onFit}>
        {t.waveform.fit}
      </button>
      {selected
        ? primary.map((action) => (
            <button
              key={action.id}
              type="button"
              className={action.danger ? styles.dangerButton : styles.textButton}
              disabled={action.disabled}
              {...guideTargetAttrs(guideTargetForAction(action.id))}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))
        : null}
      <button
        type="button"
        className={styles.textButton}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t.workspace.moreEdit}
        onClick={() => setOpen((value) => !value)}
      >
        •••
      </button>
      {open && selected ? (
        <div className={styles.menu} id={menuId} role="menu">
          {more.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              disabled={action.disabled}
              {...guideTargetAttrs(guideTargetForAction(action.id))}
              onClick={() => {
                setOpen(false)
                action.onClick()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
