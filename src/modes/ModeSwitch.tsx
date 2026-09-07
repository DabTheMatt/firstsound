import { useI18n } from '../i18n'
import { UI_MODES, type UiMode } from './uiMode'
import styles from './ModeSwitch.module.css'

type Props = {
  mode: UiMode
  onChange: (mode: UiMode) => void
  variant?: 'pill' | 'editorial'
  compact?: boolean
}

export function ModeSwitch({ mode, onChange, variant = 'pill', compact = false }: Props) {
  const { t } = useI18n()
  const labels: Record<UiMode, string> = {
    simple: t.mode.simple,
    sensory: t.mode.sensory,
    technical: t.mode.technical,
  }
  return (
    <div
      className={`${styles.switch} ${variant === 'editorial' ? styles.editorial : ''} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label={t.mode.group}
    >
      {UI_MODES.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          className={`${styles.opt} ${mode === id ? styles.on : ''}`}
          onClick={() => onChange(id)}
        >
          {variant === 'editorial' && mode === id ? <span className={styles.dot} aria-hidden="true" /> : null}
          {labels[id]}
        </button>
      ))}
    </div>
  )
}
