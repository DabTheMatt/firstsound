import { useId } from 'react'
import styles from './DragFree.module.css'

type Props = {
  id?: string
  label: string
  spoken: string
  value: string
  disabled?: boolean
  inputRef?: (node: HTMLInputElement | null) => void
  onChange: (value: string) => void
  onEnter?: () => void
}

/** Text clock. The parent decides when a pair of times is valid. */
export function TimeField({ id, label, spoken, value, disabled = false, inputRef, onChange, onEnter }: Props) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <label className={styles.field} htmlFor={fieldId}>
      <span>{label}</span>
      <input
        id={fieldId}
        ref={inputRef}
        className={styles.clock}
        value={value}
        disabled={disabled}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={spoken}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onEnter?.()
          }
        }}
      />
    </label>
  )
}
