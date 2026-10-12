import { useI18n } from '../i18n'
import { hearingUi } from '../i18n/hearingUi'
import { EarIcon } from './EarIcon'
import styles from './HearingAccessLayer.module.css'
import { useHearingSettings } from './useHearingSettings'

/** Sits immediately to the left of Export. Hidden until Hearing Access is on. */
export function HearingTransportButton({ hidden = false }: { hidden?: boolean }) {
  const { settings, patch } = useHearingSettings()
  const copy = hearingUi(useI18n().locale)
  if (hidden || !settings.enabled) return null
  return (
    <button
      type="button"
      className={styles.besideExport}
      aria-pressed={settings.panelOpen}
      aria-label={copy.title}
      title={copy.title}
      onClick={() => patch({ panelOpen: !settings.panelOpen })}
    >
      <EarIcon />
    </button>
  )
}
