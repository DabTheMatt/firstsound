import { EarIcon } from './EarIcon'
import styles from './HearingAccessLayer.module.css'
import { useHearingSettings } from './useHearingSettings'

/** Sits immediately to the left of Export. Hidden until Hearing Access is on. */
export function HearingTransportButton({ hidden = false }: { hidden?: boolean }) {
  const { settings, patch } = useHearingSettings()
  if (hidden || !settings.enabled) return null
  return (
    <button
      type="button"
      className={styles.besideExport}
      aria-pressed={settings.panelOpen}
      aria-label="Hearing Access"
      title="Hearing Access"
      onClick={() => patch({ panelOpen: !settings.panelOpen })}
    >
      <EarIcon />
    </button>
  )
}
