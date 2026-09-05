import type { UiMode } from './uiMode'
import styles from './ModeSwitch.module.css'

type Props = {
  mode: UiMode
  onChange: (mode: UiMode) => void
  variant?: 'pill' | 'editorial'
}

export function ModeSwitch({ mode, onChange, variant = 'pill' }: Props) {
  return (
    <div
      className={`${styles.switch} ${variant === 'editorial' ? styles.editorial : ''}`}
      role="radiogroup"
      aria-label="Interface language"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'sensory'}
        className={`${styles.opt} ${mode === 'sensory' ? styles.on : ''}`}
        onClick={() => onChange('sensory')}
      >
        {variant === 'editorial' && mode === 'sensory' ? <span className={styles.dot} aria-hidden="true" /> : null}
        Sensory
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'technical'}
        className={`${styles.opt} ${mode === 'technical' ? styles.on : ''}`}
        onClick={() => onChange('technical')}
      >
        {variant === 'editorial' && mode === 'technical' ? <span className={styles.dot} aria-hidden="true" /> : null}
        Technical
      </button>
    </div>
  )
}
