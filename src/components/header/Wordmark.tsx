import styles from './Wordmark.module.css'

type Props = {
  variant?: 'studio' | 'editorial' | 'gate'
  compact?: boolean
}

export function Wordmark({ variant = 'studio', compact = false }: Props) {
  return (
    <p
      className={`${styles.mark} ${styles[variant]} ${compact ? styles.compact : ''}`}
      aria-hidden={variant === 'gate' ? undefined : true}
    >
      <span className={styles.logo} role="img" aria-label="FIELD" />
    </p>
  )
}
