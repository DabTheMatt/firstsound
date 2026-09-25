import { useA11ySettings } from '../../a11y'
import styles from './Toggle.module.css'

type Props = {
  pressed: boolean
  label: string
  /** Other state label. Reserves width so toggling does not shift layout. */
  reserveLabel?: string
  title?: string
  onToggle: () => void
  compact?: boolean
}

export function Toggle({ pressed, label, reserveLabel, onToggle, compact, title }: Props) {
  const { settings } = useA11ySettings()
  return (
    <button
      type="button"
      className={`${styles.loop} ${compact ? styles.compact : ''} ${pressed ? styles.active : ''}`}
      aria-pressed={pressed}
      title={title ?? label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      {settings.lowVision ? (
        <span className={styles.mark} aria-hidden="true">
          {pressed ? '●' : '○'}
        </span>
      ) : null}
      <span className={styles.labelStack}>
        <span>{label}</span>
        {reserveLabel && reserveLabel !== label ? (
          <span className={styles.labelReserve} aria-hidden="true">
            {reserveLabel}
          </span>
        ) : null}
      </span>
    </button>
  )
}
