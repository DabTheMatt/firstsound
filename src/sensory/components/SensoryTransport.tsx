import { engine } from '../../hooks/useEngine'
import styles from './SensoryTransport.module.css'

type Props = {
  playing: boolean
  loop: boolean
  disabled: boolean
  onToggleLoop: () => void
}

export function SensoryTransport({ playing, loop, disabled, onToggleLoop }: Props) {
  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.play}
        disabled={disabled}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => {
          void engine.unlock().then(() => engine.togglePlay())
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button
        type="button"
        className={`${styles.loop} ${loop ? styles.loopOn : ''}`}
        disabled={disabled}
        aria-pressed={loop}
        aria-label="Loop selection"
        onClick={onToggleLoop}
      >
        ↺
      </button>
    </div>
  )
}
