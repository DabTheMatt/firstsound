import styles from './TransportButton.module.css'

type Props = {
  playing: boolean
  onToggle: () => void
  disabled?: boolean
}

export function TransportButton({ playing, onToggle, disabled }: Props) {
  return (
    <button
      type="button"
      className={styles.play}
      onClick={onToggle}
      disabled={disabled}
      aria-label={playing ? 'Stop' : 'Play'}
    >
      {playing ? (
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect x="3" y="3" width="5" height="12" rx="1" fill="currentColor" />
          <rect x="10" y="3" width="5" height="12" rx="1" fill="currentColor" />
        </svg>
      ) : (
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M4 2.8v12.4L15.2 9 4 2.8Z" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}
