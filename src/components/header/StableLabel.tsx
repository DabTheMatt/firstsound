import styles from './StableLabel.module.css'

type Props = {
  text: string
  /** Strings that reserve width. The visible label never grows past the widest sample. */
  samples: readonly string[]
  className?: string
}

export function StableLabel({ text, samples, className }: Props) {
  return (
    <span className={className ? `${styles.label} ${className}` : styles.label}>
      {samples.map((sample, index) => (
        <span key={`${index}:${sample}`} className={styles.sizer} aria-hidden="true">
          {sample}
        </span>
      ))}
      <span className={styles.current}>{text}</span>
    </span>
  )
}
