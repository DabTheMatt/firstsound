import { useId } from 'react'
import { useI18n } from '../i18n'
import { HearingAccessSettings } from '../hearing/HearingAccessSettings'
import { announce } from './liveRegion'
import { DEFAULT_A11Y_SETTINGS, type A11ySettings as A11yState } from './settings'
import { useA11ySettings } from './useA11ySettings'
import styles from './A11ySettings.module.css'

type SwitchProps = {
  checked: boolean
  label: string
  description: string
  extraDescription?: string
  onLabel: string
  offLabel: string
  onChange: (next: boolean) => void
}

function PreferenceSwitch({
  checked,
  label,
  description,
  extraDescription,
  onLabel,
  offLabel,
  onChange,
}: SwitchProps) {
  const labelId = useId()
  const helpId = useId()
  const extraId = useId()
  const describedBy = extraDescription ? `${helpId} ${extraId}` : helpId
  return (
    <div className={styles.option}>
      <div className={styles.copy}>
        <span id={labelId} className={styles.optionLabel}>
          {label}
        </span>
        <p id={helpId} className={styles.help}>
          {description}
        </p>
        {extraDescription ? (
          <p id={extraId} className={styles.help}>
            {extraDescription}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.switch}
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true">{checked ? onLabel : offLabel}</span>
      </button>
    </div>
  )
}

type Props = {
  onBack: () => void
}

export function A11ySettings({ onBack }: Props) {
  const { t } = useI18n()
  const { settings, setSettings } = useA11ySettings()
  const a = t.a11y

  const restore = () => {
    const next: A11yState = { ...DEFAULT_A11Y_SETTINGS }
    setSettings(next)
    announce(a.restored)
  }

  return (
    <section className={styles.section} aria-labelledby="field-access-title">
      <button type="button" className={styles.back} onClick={onBack}>
        {a.back}
      </button>
      <header className={styles.header}>
        <h2 id="field-access-title" className={styles.title}>
          {a.accessTitle}
        </h2>
        <p className={styles.subtitle}>{a.accessSubtitle}</p>
      </header>

      <div>
        <h3 className={styles.group}>{a.visualComfort}</h3>
        <PreferenceSwitch
          checked={settings.reduceMotion}
          label={a.reduceMotion}
          description={a.reducedMotionHelp}
          extraDescription={a.reducedMotionSystem}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(reduceMotion) => setSettings({ reduceMotion })}
        />
      </div>

      <div>
        <h3 className={styles.group}>{a.interaction}</h3>
        <PreferenceSwitch
          checked={settings.enhancedFocus}
          label={a.focus}
          description={a.focusHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(enhancedFocus) => setSettings({ enhancedFocus })}
        />
        <PreferenceSwitch
          checked={settings.largerInterface}
          label={a.larger}
          description={a.largerHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(largerInterface) => setSettings({ largerInterface })}
        />
      </div>

      <p className={styles.saved}>{a.saved}</p>
      <button type="button" className={styles.restore} onClick={restore}>
        {a.restore}
      </button>

      <details className={styles.more}>
        <summary>{a.more}</summary>
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
        <HearingAccessSettings />
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
      </details>
    </section>
  )
}
