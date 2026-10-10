import { guideTargetAttrs } from '../../guide/targets'
import type { GuideTargetId } from '../../guide/types'
import styles from './Segmented.module.css'

type Option<T extends string> = { value: T; label: string; title?: string }

type Props<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  wrap?: boolean
  guideTarget?: GuideTargetId
}

/**
 * Touch-first segmented selector. Uses click (works for pointer + touch + keyboard)
 * with a radiogroup role so it stays accessible without requiring hover.
 */
export function Segmented<T extends string>({ label, value, options, onChange, wrap, guideTarget }: Props<T>) {
  return (
    <div className={`${styles.group} ${wrap ? styles.wrap : ''}`} role="radiogroup" aria-label={label} {...guideTargetAttrs(guideTarget ?? null)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title ?? option.label}
            className={`${styles.segment} ${active ? styles.active : ''}`}
            data-geometry="pill"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
