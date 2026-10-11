import { radioGroupKey } from '../a11y/keyboard'
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
  const full: Record<UiMode, string> = {
    simple: t.mode.simple,
    sensory: t.mode.sensory,
    technical: t.mode.technical,
  }
  const labels: Record<UiMode, string> = {
    simple: t.mode.simpleShort,
    sensory: t.mode.sensoryShort,
    technical: t.mode.technicalShort,
  }
  return (
    <div
      className={`${styles.switch} ${variant === 'editorial' ? styles.editorial : ''} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label={t.mode.group}
      onKeyDown={(event) => radioGroupKey(event)}
    >
      {UI_MODES.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          aria-label={full[id]}
          title={full[id]}
          data-mode-option={id}
          className={`${styles.opt} ${mode === id ? styles.on : ''}`}
          data-geometry={variant === 'editorial' ? undefined : 'pill'}
          onClick={() => onChange(id)}
        >
          {variant === 'editorial' ? (
            <span className={`${styles.dot} ${mode === id ? '' : styles.dotOff}`} aria-hidden="true" />
          ) : null}
          {labels[id]}
        </button>
      ))}
    </div>
  )
}
