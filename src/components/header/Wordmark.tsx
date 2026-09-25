import type { UiMode } from '../../modes/uiMode'
import styles from './Wordmark.module.css'

const MODE_LABEL: Record<UiMode, string> = {
  simple: 'Simple',
  technical: 'Technical',
  sensory: 'Sensory',
}

type Props = {
  mode?: UiMode | null
  variant?: 'studio' | 'editorial' | 'gate'
  compact?: boolean
}

export function Wordmark({ mode, variant = 'studio', compact = false }: Props) {
  const label = mode ? MODE_LABEL[mode] : null
  return (
    <p
      className={`${styles.mark} ${styles[variant]} ${compact ? styles.compact : ''}`}
      aria-hidden={variant === 'gate' ? undefined : true}
    >
      <span className={styles.name}>INTERFER</span>
      {label ? <span className={styles.mode}>{label}</span> : null}
    </p>
  )
}
