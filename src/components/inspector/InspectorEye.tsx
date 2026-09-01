import styles from './InspectorEye.module.css'

type Props = {
  open: boolean
  onClick: () => void
}

export function InspectorEye({ open, onClick }: Props) {
  const label = open ? 'Hide inspector' : 'Show inspector'
  return (
    <button
      type="button"
      className={`${styles.eye} ${open ? styles.open : ''}`}
      aria-label={label}
      aria-pressed={open}
      title={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12 17.9 18.5 12 18.5 2.5 12 2.5 12Z"
        />
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        {open ? null : (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M4 20 20 4"
          />
        )}
      </svg>
    </button>
  )
}
