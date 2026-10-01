import { useEffect, useId, useRef, useState } from 'react'
import type { PhoneViz } from '../../app/phoneWorkspace'
import { useI18n } from '../../i18n'
import { BackgroundControl } from '../waveform/BackgroundControl'
import styles from './MobileChrome.module.css'

type VizProps = {
  viz: PhoneViz
  expanded: boolean
  onViz: (viz: PhoneViz) => void
  onToggleExpanded: () => void
}

const VIZ_ORDER: PhoneViz[] = ['wave', 'fft', 'eq', 'auto']

export function MobileVizSwitch({ viz, expanded, onViz, onToggleExpanded }: VizProps) {
  const { t } = useI18n()
  const labels: Record<PhoneViz, string> = {
    wave: 'Wave',
    fft: 'FFT',
    eq: 'EQ',
    auto: t.waveform.automationCaption,
  }
  const titles: Record<PhoneViz, string> = {
    wave: t.waveform.waveTitle,
    fft: t.waveform.spectrum,
    eq: t.waveform.eqTitle,
    auto: t.waveform.automationTitle,
  }
  return (
    <div className={styles.vizSwitch} role="toolbar" aria-label={t.waveform.viewGroup}>
      <div className={styles.modes} role="radiogroup" aria-label={t.waveform.viewGroup}>
        {VIZ_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={viz === id}
            aria-label={titles[id]}
            className={viz === id ? styles.modeOn : styles.mode}
            onClick={() => onViz(id)}
          >
            {labels[id]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.expand}
        aria-pressed={expanded}
        aria-label={expanded ? 'Collapse visualization' : 'Expand visualization'}
        onClick={onToggleExpanded}
      >
        {expanded ? '▾' : '▴'}
      </button>
    </div>
  )
}

type EditProps = {
  canCopy: boolean
  canCut: boolean
  canPaste: boolean
  canDelete: boolean
  canMute: boolean
  canUndo: boolean
  canRedo: boolean
  canInsert: boolean
  canClear: boolean
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onMute: () => void
  onUndo: () => void
  onRedo: () => void
  onInsert: () => void
  onTrim: () => void
  onClear: () => void
  onAutoFade: () => void
  onFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onNormalize: () => void
  normalizeOn: boolean
  zoomLabel: string
  onBands: () => void
  onExport: () => void
  onFx: () => void
}

type Group = 'edit' | 'view' | 'fx'

export function MobileContextBar(props: EditProps) {
  const { t } = useI18n()
  const [group, setGroup] = useState<Group | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  const choose = (next: Group) => {
    setMoreOpen(false)
    setGroup((current) => (current === next ? null : next))
    if (next === 'fx') props.onFx()
  }

  const edits = [
    props.canCopy ? { id: 'copy', label: t.waveform.copyCaption, title: t.waveform.copySelection, run: props.onCopy } : null,
    props.canCut ? { id: 'cut', label: t.waveform.cutCaption, title: t.waveform.cutSelection, run: props.onCut } : null,
    props.canPaste ? { id: 'paste', label: t.waveform.pasteCaption, title: t.waveform.pastePlayhead, run: props.onPaste } : null,
    props.canDelete ? { id: 'delete', label: t.waveform.deleteSelectionCaption, title: t.waveform.deleteSelection, run: props.onDelete } : null,
    props.canMute ? { id: 'mute', label: t.waveform.muteSelectionCaption, title: t.waveform.muteSelection, run: props.onMute } : null,
  ].filter((item): item is { id: string; label: string; title: string; run: () => void } => item != null)

  return (
    <div className={styles.context}>
      <div className={styles.groups} role="toolbar" aria-label={t.waveform.edit}>
        <button type="button" className={group === 'edit' ? styles.groupOn : styles.group} aria-pressed={group === 'edit'} onClick={() => choose('edit')}>
          {t.waveform.edit}
        </button>
        <button type="button" className={group === 'view' ? styles.groupOn : styles.group} aria-pressed={group === 'view'} onClick={() => choose('view')}>
          {t.waveform.viewGroup}
        </button>
        <button type="button" className={group === 'fx' ? styles.groupOn : styles.group} aria-pressed={group === 'fx'} onClick={() => choose('fx')}>
          FX
        </button>
        <div className={styles.moreWrap} ref={moreRef}>
          <button
            type="button"
            className={moreOpen ? styles.groupOn : styles.group}
            aria-expanded={moreOpen}
            aria-controls={menuId}
            aria-label={t.waveform.moreEdits}
            onClick={() => {
              setGroup(null)
              setMoreOpen((open) => !open)
            }}
          >
            •••
          </button>
          {moreOpen ? (
            <div className={styles.moreMenu} id={menuId} role="menu">
              <MenuButton label={t.waveform.undo} disabled={!props.canUndo} onClick={() => { props.onUndo(); setMoreOpen(false) }} />
              <MenuButton label={t.waveform.redo} disabled={!props.canRedo} onClick={() => { props.onRedo(); setMoreOpen(false) }} />
              <MenuButton label={t.waveform.insertSilence} disabled={!props.canInsert} onClick={() => { props.onInsert(); setMoreOpen(false) }} />
              <MenuButton label={t.waveform.trim} disabled={false} onClick={() => { props.onTrim(); setMoreOpen(false) }} />
              <MenuButton label={t.waveform.clearSelection} disabled={!props.canClear} onClick={() => { props.onClear(); setMoreOpen(false) }} />
              <MenuButton label={t.waveform.autoFade} disabled={false} onClick={() => { props.onAutoFade(); setMoreOpen(false) }} />
              <MenuButton label={t.waveform.spectral.title} disabled={false} onClick={() => { props.onBands(); setMoreOpen(false) }} />
              <MenuButton label={t.transport.export} disabled={false} onClick={() => { props.onExport(); setMoreOpen(false) }} />
            </div>
          ) : null}
        </div>
      </div>
      {group === 'edit' ? (
        <div className={styles.actions} role="group" aria-label={t.waveform.edit}>
          {edits.length ? (
            edits.map((item) => (
              <button key={item.id} type="button" className={styles.action} title={item.title} onClick={item.run}>
                {item.label}
              </button>
            ))
          ) : (
            <p className={styles.hint}>{t.waveform.edit}</p>
          )}
        </div>
      ) : null}
      {group === 'view' ? (
        <div className={styles.actions} role="group" aria-label={t.waveform.viewGroup}>
          <button type="button" className={styles.action} onClick={props.onFit}>{t.waveform.fit}</button>
          <button type="button" className={styles.action} onClick={props.onZoomOut} aria-label={t.waveform.zoomOut}>−</button>
          <span className={styles.zoom}>{props.zoomLabel}</span>
          <button type="button" className={styles.action} onClick={props.onZoomIn} aria-label={t.waveform.zoomIn}>+</button>
          <button type="button" className={props.normalizeOn ? styles.actionOn : styles.action} aria-pressed={props.normalizeOn} onClick={props.onNormalize}>
            {t.waveform.norm}
          </button>
          <BackgroundControl />
        </div>
      ) : null}
    </div>
  )
}

function MenuButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className={styles.menuItem} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}
