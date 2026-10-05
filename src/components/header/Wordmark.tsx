import styles from './Wordmark.module.css'

const BRAND_NAME = 'Field'

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
      <span className={styles.name}>{BRAND_NAME}</span>
    </p>
  )
}
