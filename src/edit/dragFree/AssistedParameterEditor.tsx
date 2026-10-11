import { useId, useState } from 'react'
import { formatAccessibleValue } from '../../a11y/valueText'
import { applyParamValue, formatParamValue, fromNormalized, parseTypedParam, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import type { ParamDef } from '../../audio/parameters/types'
import { useI18n } from '../../i18n'
import styles from './DragFree.module.css'

export type AssistedRange = {
  min: number
  max: number
  step: number
}

type Props = {
  label: string
  value: number
  spoken?: string
  disabled?: boolean
  def?: ParamDef
  range?: AssistedRange
  onApply: (value: number) => void
}

function stepped(def: ParamDef, value: number, direction: -1 | 1): number {
  const span = Math.max(def.max - def.min, 1e-9)
  const delta = def.mapping === 'linear' && def.step != null ? def.step / span : 0.01
  const next = fromNormalized(Math.min(1, Math.max(0, toNormalized(value, def) + direction * delta)), def)
  return applyParamValue(next, def)
}

function stepRange(range: AssistedRange, value: number, direction: -1 | 1): number {
  const next = Math.round((value + direction * range.step) / range.step) * range.step
  return Math.min(range.max, Math.max(range.min, next))
}

/** Exact parameter entry on the existing definition. The caller owns the value. */
export function AssistedParameterEditor({ label, def, range, value, spoken, disabled = false, onApply }: Props) {
  const { t, locale } = useI18n()
  const inputId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const shown = draft ?? (def ? formatParamValue(value, def) : value.toFixed(2))
  const accessible = spoken ?? (def ? formatAccessibleValue(value, def, locale) : value.toFixed(2))

  const commitText = (text: string) => {
    const next = def ? parseTypedParam(text, def) : range ? parseTypedRange(text, range.min, range.max) : null
    if (next == null || (range && (next < range.min || next > range.max))) {
      setError(true)
      return false
    }
    setError(false)
    setDraft(null)
    onApply(next)
    return true
  }

  return (
    <div className={styles.field} data-assisted-editor="">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        value={shown}
        disabled={disabled}
        inputMode="decimal"
        aria-invalid={error}
        aria-describedby={error ? errorId : undefined}
        aria-label={`${label}, ${accessible}`}
        onChange={(event) => {
          setDraft(event.target.value)
          setError(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitText(event.currentTarget.value)
          }
          if (event.key === 'Escape') {
            setDraft(null)
            setError(false)
          }
        }}
        onBlur={(event) => {
          if (draft == null) return
          commitText(event.currentTarget.value)
        }}
      />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={disabled}
          aria-label={`${label}, −`}
          onClick={() => {
            setDraft(null)
            setError(false)
            onApply(def ? stepped(def, value, -1) : stepRange(range ?? { min: 0, max: 1, step: 0.01 }, value, -1))
          }}
        >
          −
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={disabled}
          aria-label={`${label}, +`}
          onClick={() => {
            setDraft(null)
            setError(false)
            onApply(def ? stepped(def, value, 1) : stepRange(range ?? { min: 0, max: 1, step: 0.01 }, value, 1))
          }}
        >
          +
        </button>
      </div>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {t.dragFree.errRange}
        </p>
      ) : null}
    </div>
  )
}
