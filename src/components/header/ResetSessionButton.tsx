import { useState } from 'react'
import { sessionHasWork } from '../../app/sessionWork'
import { useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './ResetSessionButton.module.css'

type Props = {
  onReset: () => void
  label?: string
  toolbar?: boolean
}

export function ResetSessionButton({ onReset, label, toolbar = false }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const [open, setOpen] = useState(false)

  const run = () => {
    setOpen(false)
    onReset()
  }

  const ask = () => {
    if (!sessionHasWork(snap)) {
      run()
      return
    }
    setOpen(true)
  }

  const className = toolbar ? styles.toolbar : label ? styles.menu : styles.button

  return (
    <>
      <button type="button" className={className} title={t.header.resetTitle} aria-label={t.header.resetTitle} onClick={ask}>
        {label ? label : null}
        {label ? null : (
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path
            d="M16.5 10a6.5 6.5 0 1 1-1.7-4.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M16.8 3.2v3.4h-3.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        )}
      </button>
      {open ? (
        <div className={styles.layer} role="presentation">
          <button type="button" className={styles.scrim} aria-label={t.header.resetCancel} onClick={() => setOpen(false)} />
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={t.header.resetConfirm}>
            <p>{t.header.resetConfirm}</p>
            <div className={styles.actions}>
              <button type="button" onClick={() => setOpen(false)}>
                {t.header.resetCancel}
              </button>
              <button type="button" className={styles.danger} onClick={run}>
                {t.header.resetAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
