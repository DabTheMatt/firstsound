import type { UiMode } from './uiMode'
import styles from './ModeSwitch.module.css'

type Props = {
  mode: UiMode
  onChange: (mode: UiMode) => void
}

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className={styles.switch} role="radiogroup" aria-label="Interface language">
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'sensory'}
        className={`${styles.opt} ${mode === 'sensory' ? styles.on : ''}`}
        onClick={() => onChange('sensory')}
      >
        Sensory
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'technical'}
        className={`${styles.opt} ${mode === 'technical' ? styles.on : ''}`}
        onClick={() => onChange('technical')}
      >
        Technical
      </button>
    </div>
  )
}
