import styles from './Toggle.module.css'

type Props = {
  pressed: boolean
  label: string
  onToggle: () => void
}

export function Toggle({ pressed, label, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`${styles.loop} ${pressed ? styles.active : ''}`}
      aria-pressed={pressed}
      onClick={onToggle}
    >
      {label}
    </button>
  )
}
