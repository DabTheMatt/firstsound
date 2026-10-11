import { useId } from 'react'
import { useI18n } from '../i18n'
import { HearingAccessSettings } from '../hearing/HearingAccessSettings'
import { announce } from './liveRegion'
import {
  DEFAULT_A11Y_SETTINGS,
  INTERFACE_SCALE_MAX,
  INTERFACE_SCALE_MIN,
  INTERFACE_SCALE_PRESETS,
  SCALE_STEP,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_PRESETS,
  clampScale,
  scalePercent,
  type A11ySettings as A11yState,
} from './settings'
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

type ScaleProps = {
  label: string
  description: string
  value: number
  min: number
  max: number
  presets: readonly number[]
  onChange: (next: number) => void
}

function ScalePreference({ label, description, value, min, max, presets, onChange }: ScaleProps) {
  const labelId = useId()
  const helpId = useId()
  const rangeId = useId()
  const percent = scalePercent(value)
  return (
    <div className={styles.scale}>
      <div className={styles.copy}>
        <label id={labelId} htmlFor={rangeId} className={styles.optionLabel}>
          {label}
        </label>
        <p id={helpId} className={styles.help}>
          {description}
        </p>
      </div>
      <div className={styles.scaleRow}>
        <input
          id={rangeId}
          className={styles.range}
          type="range"
          min={min}
          max={max}
          step={SCALE_STEP}
          value={value}
          aria-labelledby={labelId}
          aria-describedby={helpId}
          aria-valuetext={`${percent}%`}
          onChange={(event) => onChange(clampScale(Number(event.target.value), min, max))}
        />
        <span className={styles.percent} aria-hidden="true">
          {percent}%
        </span>
      </div>
      <div className={styles.presets}>
        {presets.map((preset) => {
          const presetPercent = scalePercent(preset)
          const selected = presetPercent === percent
          return (
            <button
              key={preset}
              type="button"
              className={styles.preset}
              aria-pressed={selected}
              aria-label={`${label} ${presetPercent}%`}
              onClick={() => onChange(preset)}
            >
              {presetPercent}%
            </button>
          )
        })}
      </div>
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
        <ScalePreference
          label={a.interfaceSize}
          description={a.interfaceSizeHelp}
          value={settings.interfaceScale}
          min={INTERFACE_SCALE_MIN}
          max={INTERFACE_SCALE_MAX}
          presets={INTERFACE_SCALE_PRESETS}
          onChange={(interfaceScale) => setSettings({ interfaceScale })}
        />
        <ScalePreference
          label={a.textSize}
          description={a.textSizeHelp}
          value={settings.textScale}
          min={TEXT_SCALE_MIN}
          max={TEXT_SCALE_MAX}
          presets={TEXT_SCALE_PRESETS}
          onChange={(textScale) => setSettings({ textScale })}
        />
        <PreferenceSwitch
          checked={settings.highVisibility}
          label={a.highVisibility}
          description={a.highVisibilityHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(highVisibility) => setSettings({ highVisibility })}
        />
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
        <PreferenceSwitch
          checked={settings.dragFreeEditing}
          label={a.dragFree}
          description={a.dragFreeHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(dragFreeEditing) => setSettings({ dragFreeEditing })}
        />
        <PreferenceSwitch
          checked={settings.keyboardFirst}
          label={a.keyboardFirst}
          description={a.keyboardFirstHelp}
          extraDescription={a.keyboardFirstAlways}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(keyboardFirst) => setSettings({ keyboardFirst })}
        />
        <PreferenceSwitch
          checked={settings.accessibleWaveform}
          label={a.waveformNav}
          description={a.waveformNavHelp}
          extraDescription={a.waveformNavAlways}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(accessibleWaveform) => setSettings({ accessibleWaveform })}
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
