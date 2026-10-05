import styles from './Wordmark.module.css'

const BRAND_TAGLINE = 'sound / interference / transformation'

type Props = {
  variant?: 'studio' | 'editorial' | 'gate'
  compact?: boolean
  hideTagline?: boolean
}

export function Wordmark({ variant = 'studio', compact = false, hideTagline = false }: Props) {
  return (
    <p
      className={`${styles.mark} ${styles[variant]} ${compact ? styles.compact : ''} ${hideTagline ? styles.hideTagline : ''}`}
      aria-hidden={variant === 'gate' ? undefined : true}
    >
      <span className={styles.identity}>
        <span className={styles.logo} role="img" aria-label="FIELD" />
        <span className={styles.tagline}>{BRAND_TAGLINE}</span>
      </span>
    </p>
  )
}
