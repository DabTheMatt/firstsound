import { useId, useState, type ReactNode } from 'react'
import styles from './HearingAccessLayer.module.css'

/** Short control. The longer explanation opens under the icon. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={styles.infoWrap}>
      <button
        type="button"
        className={styles.info}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <span id={id} role="note" className={styles.infoNote}>
          {children}
        </span>
      ) : null}
    </span>
  )
}
