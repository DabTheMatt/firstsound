import { useA11ySettings } from '../../a11y'
import styles from './Toggle.module.css'

type Props = {
  pressed: boolean
  label: string
  onToggle: () => void
  compact?: boolean
}

export function Toggle({ pressed, label, onToggle, compact }: Props) {
  const { settings } = useA11ySettings()
  return (
    <button
      type="button"
      className={`${styles.loop} ${compact ? styles.compact : ''} ${pressed ? styles.active : ''}`}
      aria-pressed={pressed}
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
      {label}
    </button>
  )
}
