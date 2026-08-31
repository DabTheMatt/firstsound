import styles from './Segmented.module.css'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

/**
 * Touch-first segmented selector. Uses click (works for pointer + touch + keyboard)
 * with a radiogroup role so it stays accessible without requiring hover.
 */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.segment} ${active ? styles.active : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
