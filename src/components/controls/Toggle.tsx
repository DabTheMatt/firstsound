import styles from './Toggle.module.css'

type Props = {
  pressed: boolean
  label: string
  onToggle: () => void
  compact?: boolean
}

export function Toggle({ pressed, label, onToggle, compact }: Props) {
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
      {label}
    </button>
  )
}
