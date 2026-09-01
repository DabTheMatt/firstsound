import { useEffect, useRef } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { engine } from '../../hooks/useEngine'
import { TransportButton } from '../controls/TransportButton'
import styles from './CompactTransport.module.css'

type Props = {
  playing: boolean
  loop: boolean
  start: number
  end: number
  disabled: boolean
  compact: boolean
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
  disabled,
  compact,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onUseSample,
}: Props) {
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
    <div className={`${styles.bar} ${compact ? styles.compact : ''}`}>
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
          aria-label="Stop"
          onClick={() => engine.stop()}
        >
          ■
        </button>
        <button
          type="button"
          className={styles.icon}
          aria-label="Kill effects"
          title="Kill delay and reverb tails"
          onClick={() => engine.killFx('all')}
        >
          Kill FX
        </button>
        <button
          type="button"
          className={`${styles.loop} ${loop ? styles.on : ''}`}
          aria-pressed={loop}
          onClick={() => engine.setLoop(!loop)}
        >
          Loop
        </button>
        <button type="button" className={styles.icon} disabled={!canUndo} aria-label="Undo" onClick={onUndo}>
          Undo
        </button>
        <button type="button" className={styles.icon} disabled={!canRedo} aria-label="Redo" onClick={onRedo}>
          Redo
        </button>
      </div>
      <p className={styles.times}>
        <span className={styles.head} ref={playheadRef} title="Playhead">
          {formatTimecode(start)}
        </span>
        <span className={styles.selRange} title="Selection">
          {formatTimecode(start)} — {formatTimecode(end)}
        </span>
        <strong>{length.toFixed(3)} s</strong>
      </p>
      <div className={styles.jumps}>
        <button
          type="button"
          disabled={disabled}
          title="Jump the playhead to the start of the selection (loop in)"
          aria-label="Selection start"
          onClick={() => engine.seekSeconds(start, 'region')}
        >
          Sel start
        </button>
        <button
          type="button"
          disabled={disabled}
          title="Jump the playhead to the end of the selection (loop out)"
          aria-label="Selection end"
          onClick={() => engine.seekSeconds(end, 'region')}
        >
          Sel end
        </button>
      </div>
      <div className={styles.cta}>
        <button type="button" className={styles.export} disabled={disabled} onClick={onExport}>
          Export
        </button>
        <button
          type="button"
          className={styles.use}
          disabled={disabled}
          title="Bake the current selection into a new sample (fades included) and load it as the working clip."
          aria-label="Use as sample: bake the selection into the working clip"
          onClick={onUseSample}
        >
          Use as Sample
        </button>
      </div>
      <p className={styles.useHint}>
        Bakes this selection (with fades) into the working sample.
      </p>
    </div>
  )
}