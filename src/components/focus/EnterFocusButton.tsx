import styles from './EnterFocusButton.module.css'

type Props = {
  label: string
  onClick: () => void
  /** Pins the button to a corner of the nearest positioned surface. */
  corner?: boolean | 'right'
  /** Collapse icon. Same slot as enter, for the views that have Focus. */
  exit?: boolean
  /** Overrides the default "{label} focus" name. Workspace uses Enter Focus Mode. */
  accessibleName?: string
}

/** Opens or leaves Focus for one view. The brackets match the toolbar focus icon. */
export function EnterFocusButton({ label, onClick, corner = false, exit = false, accessibleName }: Props) {
  const name = accessibleName ?? (exit ? label : `${label} focus`)
  const place = corner === 'right' ? styles.cornerRight : corner ? styles.corner : ''
  return (
    <button
      type="button"
      className={place ? `${styles.button} ${place}` : styles.button}
      data-enter-focus={exit ? 'exit' : corner === 'right' ? 'corner-right' : corner ? 'corner' : 'inline'}
      data-geometry="square"
      aria-pressed={exit ? true : undefined}
      aria-label={name}
      title={name}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d={
            exit
              ? 'M6 3v3H3M10 3v3h3M13 10h-3v3M3 10h3v3'
              : 'M3 6.5V3.5H6M10 3.5h3V6.5M13 9.5v3H10M6 12.5H3V9.5'
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
