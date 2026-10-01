import { useEffect, useRef, useState } from 'react'
import type { VizMode } from '../../app/editorState'
import { phoneDisplayViz } from '../../app/phoneWorkspace'
import { useI18n } from '../../i18n'
import { BackgroundControl } from '../waveform/BackgroundControl'
import { FocusToggle } from './FocusToggle'
import styles from './MobileModeBar.module.css'

type Props = {
  viz: VizMode
  onViz: (viz: VizMode) => void
  onEnterFocus: () => void
  normalizeView: boolean
  onView: (action: 'fit-sample' | 'fit-selection' | 'normalize-view' | 'reset-zoom' | 'zoom-in' | 'zoom-out') => void
  canCopy: boolean
  canCut: boolean
  canDelete: boolean
  canMute: boolean
  /** True only for a partial highlight. The whole file is not an edit selection. */
  canClear: boolean
  onCopy?: () => void
  onCut?: () => void
  onDelete?: () => void
  onMute?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo: boolean
  canRedo: boolean
}

const MODES: { id: VizMode; label: string }[] = [
  { id: 'waveform', label: 'Wave' },
  { id: 'eq-split', label: 'EQ' },
  { id: 'automation', label: 'Auto' },
]

export function MobileModeBar({
  viz,
  onViz,
  onEnterFocus,
  normalizeView,
  onView,
  canCopy,
  canCut,
  canDelete,
  canMute,
  canClear,
  onCopy,
  onCut,
  onDelete,
  onMute,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: Props) {
  const { t } = useI18n()
  const [viewOpen, setViewOpen] = useState(false)
  const [editMore, setEditMore] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const hasSelection = canClear
  const active = phoneDisplayViz(viz)

  useEffect(() => {
    if (!viewOpen && !editMore) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null
      if (!node || barRef.current?.contains(node)) return
      setViewOpen(false)
      setEditMore(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [viewOpen, editMore])

  return (
    <div ref={barRef} className={styles.bar} data-mobile-modes="">
      <div className={styles.modes} role="tablist" aria-label={t.waveform.viewGroup}>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active === mode.id}
            className={active === mode.id ? styles.modeOn : styles.mode}
            onClick={() => onViz(mode.id)}
          >
            {mode.id === 'waveform' ? t.waveform.wave : mode.id === 'automation' ? t.waveform.automationCaption : mode.label}
          </button>
        ))}
      </div>
      <div className={styles.tools}>
        <FocusToggle expanded={false} onClick={onEnterFocus} />
        <button
          type="button"
          className={styles.icon}
          aria-expanded={viewOpen}
          aria-label={t.mobile.view}
          onClick={() => {
            setViewOpen((v) => !v)
            setEditMore(false)
          }}
        >
          {t.mobile.view}
        </button>
      </div>
      {hasSelection ? (
        <div className={styles.edit} data-mobile-edit="">
          {canCut && onCut ? (
            <button type="button" onClick={onCut}>
              {t.waveform.cutCaption}
            </button>
          ) : null}
          {canCopy && onCopy ? (
            <button type="button" onClick={onCopy}>
              {t.waveform.copyCaption}
            </button>
          ) : null}
          {canMute && onMute ? (
            <button type="button" onClick={onMute}>
              {t.waveform.muteSelectionCaption}
            </button>
          ) : null}
          {canDelete && onDelete ? (
            <button type="button" onClick={onDelete}>
              {t.waveform.deleteSelectionCaption}
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={editMore}
            aria-label={t.waveform.moreEdits}
            onClick={() => setEditMore((v) => !v)}
          >
            ···
          </button>
        </div>
      ) : null}
      {editMore && hasSelection ? (
        <div className={styles.menu} role="menu">
          <button type="button" role="menuitem" disabled={!canUndo} onClick={onUndo}>
            {t.waveform.undo}
          </button>
          <button type="button" role="menuitem" disabled={!canRedo} onClick={onRedo}>
            {t.waveform.redo}
          </button>
        </div>
      ) : null}
      {viewOpen ? (
        <div className={styles.menu} role="menu">
          <button type="button" role="menuitem" onClick={() => onView('fit-sample')}>
            {t.waveform.fitSample}
          </button>
          <button type="button" role="menuitem" onClick={() => onView('fit-selection')}>
            {t.waveform.fitSelection}
          </button>
          <button type="button" role="menuitem" onClick={() => onView('zoom-in')}>
            {t.waveform.zoomIn}
          </button>
          <button type="button" role="menuitem" onClick={() => onView('zoom-out')}>
            {t.waveform.zoomOut}
          </button>
          <button type="button" role="menuitem" aria-pressed={normalizeView} onClick={() => onView('normalize-view')}>
            {t.waveform.normalizeView}
          </button>
          <button type="button" role="menuitem" onClick={() => onView('reset-zoom')}>
            {t.waveform.resetZoom}
          </button>
          <BackgroundControl />
        </div>
      ) : null}
    </div>
  )
}
