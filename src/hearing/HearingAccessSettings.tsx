import { useHearingSettings } from './useHearingSettings'
import { EVENT_KINDS, HAPTIC_INTENSITIES, type HearingProfile } from './settings'
import { vibrationSupported } from './haptics'
import styles from './HearingAccessSettings.module.css'

const PROFILES: { id: HearingProfile; label: string; detail: string }[] = [
  {
    id: 'assisted',
    label: 'Assisted listening',
    detail: 'Visual measurements beside auditory monitoring.',
  },
  {
    id: 'visual',
    label: 'Visual first',
    detail: 'Sound map, fingerprint, events, and numbers. Does not assume you can hear the result.',
  },
  {
    id: 'visual-haptic',
    label: 'Visual + haptic',
    detail: 'The visual profile plus optional pulses where the device supports them.',
  },
]

export function HearingAccessSettings() {
  const { settings, patch, setProfile } = useHearingSettings()
  const haptics = vibrationSupported()

  return (
    <section className={styles.section} aria-labelledby="hearing-access-heading">
      <h2 id="hearing-access-heading" className={styles.title}>
        Hearing Access
      </h2>
      <p className={styles.help}>
        An accessibility layer on top of Simple, Technical, and Sensory. It does not replace those modes.
      </p>
      <div className={styles.switch} role="group" aria-label="Hearing Access">
        <span>Hearing Access</span>
        <span className={styles.pair}>
          <button
            type="button"
            aria-pressed={!settings.enabled}
            className={!settings.enabled ? styles.on : ''}
            onClick={() => patch({ enabled: false, panelOpen: false })}
          >
            Off
          </button>
          <button
            type="button"
            aria-pressed={settings.enabled}
            className={settings.enabled ? styles.on : ''}
            onClick={() => patch({ enabled: true })}
          >
            On
          </button>
        </span>
      </div>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>Profile</legend>
        {PROFILES.map((profile) => (
          <label key={profile.id} className={styles.profile}>
            <input
              type="radio"
              name="hearing-profile"
              checked={settings.profile === profile.id}
              onChange={() => setProfile(profile.id)}
            />
            <span>
              <strong>{profile.label}</strong>
              <small>{profile.detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>Layers</legend>
        {(
          [
            ['soundMap', 'Sound map'],
            ['fingerprint', 'Sound fingerprint'],
            ['descriptors', 'Live description'],
            ['events', 'Event detection'],
            ['dynamicsMap', 'Dynamics map'],
            ['space', 'Space map'],
            ['compare', 'Before / after'],
            ['assistant', 'Visual mixing assistant'],
            ['voiceEstimate', 'Voice / background estimate'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className={styles.check}>
            <input
              type="checkbox"
              checked={settings.layers[key]}
              onChange={(event) => patch({ layers: { ...settings.layers, [key]: event.target.checked } })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>Monitoring assistance</legend>
        <p className={styles.warn}>Monitoring only. Not included in export. Not a hearing aid.</p>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.monitorEnabled}
            onChange={(event) => patch({ monitorEnabled: event.target.checked })}
          />
          <span>Monitor emphasis</span>
        </label>
        {(
          [
            ['monitorLow', 'Low'],
            ['monitorMid', 'Mid'],
            ['monitorHigh', 'High'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className={styles.slider}>
            <span>
              {label} {settings[key].toFixed(1)} dB
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              aria-label={`${label} monitor emphasis`}
              value={settings[key]}
              disabled={!settings.monitorEnabled}
              onChange={(event) => patch({ [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>Haptics</legend>
        {haptics ? null : <p className={styles.help}>This browser does not provide vibration. Haptic controls stay off.</p>}
        <label className={styles.slider}>
          <span>Intensity</span>
          <select
            aria-label="Haptic intensity"
            value={settings.hapticIntensity}
            disabled={!haptics}
            onChange={(event) => patch({ hapticIntensity: event.target.value as (typeof HAPTIC_INTENSITIES)[number] })}
          >
            {HAPTIC_INTENSITIES.map((intensity) => (
              <option key={intensity} value={intensity}>
                {intensity}
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
          <span>Frequency haptics (experimental)</span>
        </label>
      </fieldset>
      <fieldset className={styles.profiles} disabled={!settings.enabled}>
        <legend className={styles.sub}>Event filters</legend>
        {EVENT_KINDS.map((kind) => (
          <label key={kind} className={styles.check}>
            <input
              type="checkbox"
              checked={settings.eventFilters[kind]}
              onChange={(event) =>
                patch({ eventFilters: { ...settings.eventFilters, [kind]: event.target.checked } })
              }
            />
            <span>{kind}</span>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
