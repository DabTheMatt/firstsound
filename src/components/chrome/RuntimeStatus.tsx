import { useState } from 'react'
import { reloadInstalledApp } from '../../app/reloadApp'
import { useRuntimeStats } from '../../app/useRuntimeStats'
import { useStandaloneDisplay } from '../../app/useStandaloneDisplay'
import styles from './RuntimeStatus.module.css'

type Props = {
  variant?: 'default' | 'editorial' | 'gate'
}

export function RuntimeStatus({ variant = 'default' }: Props) {
  const standalone = useStandaloneDisplay()
  const { memoryLabel, cpuLabel } = useRuntimeStats()
  const [busy, setBusy] = useState(false)

  const onRefresh = () => {
    if (busy) return
    setBusy(true)
    void reloadInstalledApp({
      location: window.location,
      caches: window.caches,
      serviceWorker: navigator.serviceWorker,
    }).finally(() => setBusy(false))
  }

  return (
    <div
      className={`${styles.row} ${variant === 'editorial' ? styles.editorial : ''} ${variant === 'gate' ? styles.gate : ''} ${busy ? styles.busy : ''}`}
    >
      <p className={styles.stats} aria-live="polite">
        <span>{memoryLabel}</span>
        <span>{cpuLabel}</span>
      </p>
      {standalone ? (
        <button
          type="button"
          className={styles.refresh}
          onClick={onRefresh}
          disabled={busy}
          title="Reload the installed app and drop stale caches"
        >
          {busy ? 'Refreshing' : 'Refresh app'}
        </button>
      ) : null}
    </div>
  )
}
