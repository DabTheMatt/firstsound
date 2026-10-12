import { useI18n } from '../i18n'
import { hearingUi } from '../i18n/hearingUi'
import { useHearingSettings } from './useHearingSettings'
import { EVENT_KINDS, HAPTIC_INTENSITIES, HEARING_PROFILES, type HearingProfile } from './settings'
import { vibrationSupported } from './haptics'
import styles from './HearingAccessSettings.module.css'

const PROFILE_IDS: HearingProfile[] = [...HEARING_PROFILES]

export function HearingAccessSettings() {
  const { settings, patch, setProfile } = useHearingSettings()
  const { locale } = useI18n()
  const copy = hearingUi(locale)
  const haptics = vibrationSupported()

  return (
    <section className={styles.section} aria-labelledby="hearing-access-heading">
      <h2 id="hearing-access-heading" className={styles.title}>
        {copy.title}
      </h2>
      <p className={styles.help}>{copy.settingsIntro}</p>
      <div className={styles.switch} role="group" aria-label={copy.title}>
        <span>{copy.title}</span>
        <span className={styles.pair}>
          <button
            type="button"
            aria-pressed={!settings.enabled}
            className={!settings.enabled ? styles.on : ''}
            onClick={() => patch({ enabled: false, panelOpen: false })}
          >
            {copy.off}
          </button>
          <button
            type="button"
            aria-pressed={settings.enabled}
            className={settings.enabled ? styles.on : ''}
            onClick={() => patch({ enabled: true })}
          >
            {copy.on}
          </button>
        </span>
      </div>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>{copy.profile}</legend>
        {PROFILE_IDS.map((id) => (
          <label key={id} className={styles.profile}>
            <input
              type="radio"
              name="hearing-profile"
              checked={settings.profile === id}
              onChange={() => setProfile(id)}
            />
            <span>
              <strong>{copy.profileLabel(id)}</strong>
              <small>{copy.profileDetail(id)}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>{copy.layers}</legend>
        {(
          [
            'soundMap',
            'descriptors',
            'events',
            'dynamicsMap',
            'space',
            'compare',
            'assistant',
            'voiceEstimate',
          ] as const
        ).map((key) => (
          <label key={key} className={styles.check}>
            <input
              type="checkbox"
              checked={settings.layers[key]}
              onChange={(event) => patch({ layers: { ...settings.layers, [key]: event.target.checked } })}
            />
            <span>{copy.layerLabel(key)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>{copy.monitoring}</legend>
        <p className={styles.warn}>{copy.monitor}</p>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.monitorEnabled}
            onChange={(event) => patch({ monitorEnabled: event.target.checked })}
          />
          <span>{copy.monitorEmphasis}</span>
        </label>
        {(
          [
            ['monitorLow', 'Low', 'Dół'],
            ['monitorMid', 'Mid', 'Środek'],
            ['monitorHigh', 'High', 'Góra'],
          ] as const
        ).map(([key, en, pl]) => (
          <label key={key} className={styles.slider}>
            <span>
              {(locale === 'pl' ? pl : en)} {settings[key].toFixed(1)} dB
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              aria-label={copy.monitorBand(locale === 'pl' ? pl : en)}
              value={settings[key]}
              disabled={!settings.monitorEnabled}
              onChange={(event) => patch({ [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>{copy.haptics}</legend>
        {haptics ? null : <p className={styles.help}>{copy.noVibrationSettings}</p>}
        <label className={styles.slider}>
          <span>{copy.intensity}</span>
          <select
            aria-label={copy.intensityAria}
            value={settings.hapticIntensity}
            disabled={!haptics}
            onChange={(event) => patch({ hapticIntensity: event.target.value as (typeof HAPTIC_INTENSITIES)[number] })}
          >
            {HAPTIC_INTENSITIES.map((intensity) => (
              <option key={intensity} value={intensity}>
                {copy.intensityLabel(intensity)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.frequencyHaptics}
            disabled={!haptics}
            onChange={(event) => patch({ frequencyHaptics: event.target.checked })}
          />
          <span>{copy.frequencyHaptics}</span>
        </label>
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>{copy.eventFilters}</legend>
        {EVENT_KINDS.map((kind) => (
          <label key={kind} className={styles.check}>
            <input
              type="checkbox"
              checked={settings.eventFilters[kind]}
              onChange={(event) =>
                patch({ eventFilters: { ...settings.eventFilters, [kind]: event.target.checked } })
              }
            />
            <span>{copy.eventFilter(kind)}</span>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
