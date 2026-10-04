import styles from './EnterFocusButton.module.css'

type Props = {
  label: string
  onClick: () => void
  /** Pins the button to the top-right of the nearest positioned surface. */
  corner?: boolean
}

/** Opens Focus for one view. The brackets match the toolbar focus icon. */
export function EnterFocusButton({ label, onClick, corner = false }: Props) {
  return (
    <button
      type="button"
      className={corner ? `${styles.button} ${styles.corner}` : styles.button}
      data-enter-focus=""
      aria-label={`${label} focus`}
      title={`${label} focus`}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M3 6.5V3.5H6M10 3.5h3V6.5M13 9.5v3H10M6 12.5H3V9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
