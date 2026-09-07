import { useEffect, useRef } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { TransportButton } from '../controls/TransportButton'
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
  onExport: () => void
  onUseSample: () => void
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
  onExport,
  onUseSample,
}: Props) {
  const { t } = useI18n()
  const length = Math.max(0, end - start)
  const playheadRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (playheadRef.current) playheadRef.current.textContent = formatTimecode(engine.getPlayheadSeconds())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div className={`${styles.bar} ${compact ? styles.compact : ''} ${minimal ? styles.minimal : ''}`}>
      <div className={styles.transport}>
        <TransportButton
          playing={playing}
          disabled={disabled}
          onToggle={() => {
            void engine.unlock().then(() => engine.togglePlay())
          }}
        />
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
        {!minimal ? (
          <button
            type="button"
            className={styles.icon}
            disabled={disabled}
            aria-label={t.transport.stop}
            onClick={() => engine.stop()}
          >
            ■
          </button>
        ) : null}
        {!minimal ? (
          <button
            type="button"
            className={styles.icon}
            aria-label={t.transport.killFx}
            title={t.transport.killFxTitle}
            onClick={() => engine.killFx('all')}
          >
            {t.transport.killFx}
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.loop} ${loop ? styles.on : ''}`}
          aria-pressed={loop}
          onClick={() => engine.setLoop(!loop)}
        >
          {t.transport.loop}
        </button>
        {!minimal ? (
          <button type="button" className={styles.icon} disabled={!canUndo} aria-label={t.transport.undo} onClick={onUndo}>
            {t.transport.undo}
          </button>
        ) : null}
        {!minimal ? (
          <button type="button" className={styles.icon} disabled={!canRedo} aria-label={t.transport.redo} onClick={onRedo}>
            {t.transport.redo}
          </button>
        ) : null}
      </div>
      <p className={styles.times}>
        <span className={styles.head} ref={playheadRef} title={t.transport.playhead}>
          {formatTimecode(start)}
        </span>
        {!minimal ? (
          <span className={styles.selRange} title={t.transport.selection}>
            {formatTimecode(start)} — {formatTimecode(end)}
          </span>
        ) : null}
        <strong>{length.toFixed(3)} s</strong>
        <span className={styles.bpm} title={t.transport.bpmTitle}>
          {bpm.toFixed(1)} BPM
        </span>
      </p>
      {!minimal ? (
        <div className={styles.jumps}>
          <button
            type="button"
            disabled={disabled}
            title={t.transport.selStartTitle}
            aria-label={t.transport.selStart}
            onClick={() => engine.seekSeconds(start, 'region')}
          >
            {t.transport.selStart}
          </button>
          <button
            type="button"
            disabled={disabled}
            title={t.transport.selEndTitle}
            aria-label={t.transport.selEnd}
            onClick={() => engine.seekSeconds(end, 'region')}
          >
            {t.transport.selEnd}
          </button>
        </div>
      ) : null}
      <div className={styles.cta}>
        {!minimal ? (
          <button type="button" className={styles.export} disabled={disabled} onClick={onExport}>
            {t.transport.export}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.use}
          disabled={disabled}
          title={t.transport.useTitle}
          aria-label={t.transport.useTitle}
          onClick={onUseSample}
        >
          {minimal ? t.transport.use : t.transport.useAsSample}
        </button>
      </div>
      {!minimal ? <p className={styles.useHint}>{t.transport.useHint}</p> : null}
    </div>
  )
}