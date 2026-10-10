import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import { guideTargetAttrs } from '../../guide/targets'
import { useI18n } from '../../i18n'
import { TransportButton } from '../controls/TransportButton'
import { transportDensity, type TransportDensity } from './transportDensity'
import styles from './CompactTransport.module.css'

type Props = {
  playing: boolean
  loop: boolean
  start: number
  end: number
  bpm: number
  disabled: boolean
  compact: boolean
  minimal?: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function CompactTransport({
  playing,
  loop,
  start,
  end,
  bpm,
  disabled,
  compact,
  minimal = false,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const { t } = useI18n()
  const length = Math.max(0, end - start)
  const playheadRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [density, setDensity] = useState<TransportDensity>(1)
  const [moreOpen, setMoreOpen] = useState(false)
  useLayoutEffect(() => {
    const node = barRef.current
    if (!node || minimal) return
    const apply = () => setDensity(transportDensity(node.clientWidth))
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    return () => observer.disconnect()
  }, [minimal])
  const iconLabels = !minimal && density >= 4
  const collapseSecondary = !minimal && density >= 5
  const actionLabel = (full: string, icon: string) => (iconLabels ? icon : full)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (playheadRef.current) playheadRef.current.textContent = formatTimecode(engine.getSourcePlayheadSeconds())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div
      ref={barRef}
      className={`${styles.bar} ${compact ? styles.compact : ''} ${minimal ? styles.minimal : ''}`}
      data-density={minimal ? undefined : density}
    >
      <div className={styles.actions}>
        {!minimal && !collapseSecondary ? (
          <button
            type="button"
            className={styles.icon}
            aria-label={t.transport.killFx}
            title={t.transport.killFxTitle}
            onClick={() => engine.killFx('all')}
          >
            {actionLabel(t.transport.killFx, 'FX×')}
          </button>
        ) : null}
        {!minimal && !collapseSecondary ? (
          <button
            type="button"
            className={styles.icon}
            aria-label={t.transport.killNoise}
            title={t.transport.killNoiseTitle}
            onClick={() => engine.killNoise()}
          >
            {actionLabel(t.transport.killNoise, 'NZ×')}
          </button>
        ) : null}
        {!minimal && !collapseSecondary ? (
          <button
            type="button"
            className={styles.icon}
            disabled={disabled}
            title={t.transport.selStartTitle}
            aria-label={t.transport.selStart}
            onClick={() => engine.seekSeconds(start, 'region')}
          >
            {actionLabel(t.transport.selStart, '|←')}
          </button>
        ) : null}
        {!minimal && !collapseSecondary ? (
          <button
            type="button"
            className={styles.icon}
            disabled={disabled}
            title={t.transport.selEndTitle}
            aria-label={t.transport.selEnd}
            onClick={() => engine.seekSeconds(end, 'region')}
          >
            {actionLabel(t.transport.selEnd, '→|')}
          </button>
        ) : null}
        {!minimal && !collapseSecondary ? (
          <button type="button" className={styles.icon} disabled={!canUndo} aria-label={t.transport.undo} title={t.transport.undo} onClick={onUndo}>
            {actionLabel(t.transport.undo, '↺')}
          </button>
        ) : null}
        {!minimal && !collapseSecondary ? (
          <button type="button" className={styles.icon} disabled={!canRedo} aria-label={t.transport.redo} title={t.transport.redo} onClick={onRedo}>
            {actionLabel(t.transport.redo, '↻')}
          </button>
        ) : null}
        {collapseSecondary ? (
          <div className={styles.moreWrap}>
            <button
              type="button"
              className={styles.icon}
              aria-label={t.transport.more}
              aria-expanded={moreOpen}
              title={t.transport.more}
              onClick={() => setMoreOpen((open) => !open)}
            >
              •••
            </button>
            {moreOpen ? (
              <div className={styles.moreMenu} role="menu">
                <button type="button" role="menuitem" onClick={() => { engine.killFx('all'); setMoreOpen(false) }}>{t.transport.killFx}</button>
                <button type="button" role="menuitem" onClick={() => { engine.killNoise(); setMoreOpen(false) }}>{t.transport.killNoise}</button>
                <button type="button" role="menuitem" disabled={disabled} onClick={() => { engine.seekSeconds(start, 'region'); setMoreOpen(false) }}>{t.transport.selStart}</button>
                <button type="button" role="menuitem" disabled={disabled} onClick={() => { engine.seekSeconds(end, 'region'); setMoreOpen(false) }}>{t.transport.selEnd}</button>
                <button type="button" role="menuitem" disabled={!canUndo} onClick={() => { onUndo(); setMoreOpen(false) }}>{t.transport.undo}</button>
                <button type="button" role="menuitem" disabled={!canRedo} onClick={() => { onRedo(); setMoreOpen(false) }}>{t.transport.redo}</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.transport}>
        {minimal ? (
          <button
            type="button"
            className={styles.icon}
            disabled={disabled}
            aria-label={t.transport.playFromStart}
            title={t.transport.playFromStartTitle}
            onClick={() => {
              void engine.unlock().then(() => engine.playFromStart())
            }}
          >
            |◀
          </button>
        ) : null}
        <TransportButton
          playing={playing}
          disabled={disabled}
          compact={minimal}
          guideTarget="transport.play"
          onToggle={() => {
            void engine.unlock().then(() => engine.togglePlay())
          }}
        />
        {!minimal ? (
          <button
            type="button"
            className={styles.icon}
            disabled={disabled}
            aria-label={t.transport.playFromStart}
            title={t.transport.playFromStartTitle}
            onClick={() => {
              void engine.unlock().then(() => engine.playFromStart())
            }}
          >
            |◀
          </button>
        ) : null}
        <button
          type="button"
          className={styles.icon}
          disabled={disabled}
          aria-label={t.transport.stop}
          onClick={() => engine.stop()}
        >
          ■
        </button>
        <button
          type="button"
          className={`${styles.loop} ${loop ? styles.on : ''}`}
          aria-pressed={loop}
          aria-label="Loop selection"
          onClick={() => engine.setLoop(!loop)}
        >
          {t.transport.loop}
        </button>
      </div>

      <div className={styles.meta}>
        <p className={styles.times}>
          <span className={styles.head} ref={playheadRef} title={t.transport.playhead}>
            {formatTimecode(start)}
          </span>
          <span className={styles.details}>
            {!minimal ? (
              <>
                <span className={styles.selRange} title={t.transport.selection}>
                  {formatTimecode(start)} — {formatTimecode(end)}
                </span>
                <strong className={styles.length}>{length.toFixed(3)} s</strong>
                <span className={styles.bpm} title={t.transport.bpmTitle}>
                  {bpm.toFixed(1)} BPM
                </span>
              </>
            ) : null}
          </span>
        </p>
      </div>
    </div>
  )
}

type ExportProps = {
  disabled: boolean
  onExport: () => void
}

/** Sits in the meter column of the transport grid so it stays on the far right. */
export function TransportExportButton({ disabled, onExport }: ExportProps) {
  const { t } = useI18n()
  return (
    <button type="button" className={styles.export} {...guideTargetAttrs('export.open')} disabled={disabled} onClick={onExport}>
      {t.transport.export}
    </button>
  )
}
