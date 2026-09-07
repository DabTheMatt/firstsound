import { useI18n } from '../i18n'
import { useA11ySettings } from './useA11ySettings'
import styles from './A11ySettings.module.css'

export function A11ySettings() {
  const { t } = useI18n()
  const { settings, setSettings } = useA11ySettings()
  const a = t.a11y

  return (
    <section className={styles.section} aria-labelledby="a11y-heading">
      <h2 id="a11y-heading" className={styles.title}>
        {a.title}
      </h2>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.lowVision}
          onChange={(event) => setSettings({ lowVision: event.target.checked })}
        />
        <span>{a.theme}</span>
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(event) => setSettings({ reduceMotion: event.target.checked })}
        />
        <span>{a.reduceMotion}</span>
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.largerInterface}
          onChange={(event) => setSettings({ largerInterface: event.target.checked })}
        />
        <span>{a.larger}</span>
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.enhancedFocus}
          onChange={(event) => setSettings({ enhancedFocus: event.target.checked })}
        />
        <span>{a.focus}</span>
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.showDescriptions}
          onChange={(event) => setSettings({ showDescriptions: event.target.checked })}
        />
        <span>{a.tips}</span>
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.screenReaderOptimizations}
          onChange={(event) => setSettings({ screenReaderOptimizations: event.target.checked })}
        />
        <span>{a.sr}</span>
      </label>
      <p className={styles.help}>{a.srHelp}</p>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={settings.shortcutsEnabled}
          onChange={(event) => setSettings({ shortcutsEnabled: event.target.checked })}
        />
        <span>{a.shortcuts}</span>
      </label>
      <p className={styles.help}>{a.shortcutsHelp}</p>
      <details className={styles.shortcuts}>
        <summary className={styles.sub}>{a.shortcutsTitle}</summary>
        <ul className={styles.list}>
          <li>{a.shortcutTab}</li>
          <li>{a.shortcutArrows}</li>
          <li>{a.shortcutShiftArrows}</li>
          <li>{a.shortcutHomeEnd}</li>
          <li>{a.shortcutPage}</li>
          <li>{a.shortcutReset}</li>
          <li>{a.shortcutSpace}</li>
          <li>{a.shortcutEsc}</li>
        </ul>
      </details>
    </section>
  )
}
