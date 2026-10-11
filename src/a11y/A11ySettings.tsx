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
  type AttentionStrength,
} from './settings'
import type { VisualActivity } from './sensoryComfort'
import { useA11ySettings } from './useA11ySettings'
import styles from './A11ySettings.module.css'

type SwitchProps = {
  checked: boolean
  label: string
  description: string
  extraDescription?: string
  onLabel: string
  offLabel: string
  disabled?: boolean
  onChange: (next: boolean) => void
}

function PreferenceSwitch({
  checked,
  label,
  description,
  extraDescription,
  onLabel,
  offLabel,
  disabled = false,
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
        disabled={disabled}
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

function StrengthChoice({
  label,
  description,
  value,
  subtle,
  clear,
  onChange,
}: {
  label: string
  description: string
  value: AttentionStrength
  subtle: string
  clear: string
  onChange: (next: AttentionStrength) => void
}) {
  const labelId = useId()
  const helpId = useId()
  return (
    <div className={styles.option}>
      <div className={styles.copy}>
        <span id={labelId} className={styles.optionLabel}>
          {label}
        </span>
        <p id={helpId} className={styles.help}>
          {description}
        </p>
      </div>
      <div className={styles.choices} role="radiogroup" aria-labelledby={labelId} aria-describedby={helpId}>
        <button type="button" className={styles.strength} role="radio" aria-checked={value === 'subtle'} onClick={() => onChange('subtle')}>
          {subtle}
        </button>
        <button type="button" className={styles.strength} role="radio" aria-checked={value === 'clear'} onClick={() => onChange('clear')}>
          {clear}
        </button>
      </div>
    </div>
  )
}

type ActivityProps = {
  label: string
  description: string
  standardLabel: string
  lowLabel: string
  value: VisualActivity
  disabled: boolean
  onChange: (next: VisualActivity) => void
}

function VisualActivityChoice({
  label,
  description,
  standardLabel,
  lowLabel,
  value,
  disabled,
  onChange,
}: ActivityProps) {
  const name = useId()
  const helpId = useId()
  return (
    <fieldset className={styles.choice} disabled={disabled} aria-describedby={helpId}>
      <legend className={styles.optionLabel}>{label}</legend>
      <p id={helpId} className={styles.help}>
        {description}
      </p>
      <div className={styles.choiceRow}>
        <label className={styles.choiceLabel}>
          <input
            type="radio"
            name={name}
            value="standard"
            checked={value === 'standard'}
            onChange={() => onChange('standard')}
          />
          {standardLabel}
        </label>
        <label className={styles.choiceLabel}>
          <input type="radio" name={name} value="low" checked={value === 'low'} onChange={() => onChange('low')} />
          {lowLabel}
        </label>
      </div>
    </fieldset>
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
        <h3 className={styles.group}>{a.cognitive}</h3>
        <PreferenceSwitch
          checked={settings.attentionFocus}
          label={a.attentionFocus}
          description={a.attentionFocusHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(attentionFocus) => setSettings({ attentionFocus })}
        />
        <StrengthChoice
          label={a.attentionStrength}
          description={`${a.attentionSubtle} / ${a.attentionClear}`}
          value={settings.attentionStrength}
          subtle={a.attentionSubtle}
          clear={a.attentionClear}
          onChange={(attentionStrength) => setSettings({ attentionStrength })}
        />
        <PreferenceSwitch
          checked={settings.attentionHighlight}
          label={a.attentionHighlight}
          description={a.attentionHighlightHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(attentionHighlight) => setSettings({ attentionHighlight })}
        />
        <PreferenceSwitch
          checked={settings.attentionReduce}
          label={a.attentionReduce}
          description={a.attentionReduceHelp}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(attentionReduce) => setSettings({ attentionReduce })}
        />
      </div>

      <div>
        <h3 className={styles.group}>{a.sensoryComfortSection}</h3>
        <PreferenceSwitch
          checked={settings.sensoryComfort}
          label={a.sensoryComfort}
          description={a.sensoryComfortHelp}
          extraDescription={a.sensoryComfortApplies}
          onLabel={a.on}
          offLabel={a.off}
          onChange={(sensoryComfort) => setSettings({ sensoryComfort })}
        />
        <VisualActivityChoice
          label={a.visualActivity}
          description={a.visualActivityHelp}
          standardLabel={a.visualActivityStandard}
          lowLabel={a.visualActivityLow}
          value={settings.visualActivity}
          disabled={!settings.sensoryComfort}
          onChange={(visualActivity) => setSettings({ visualActivity })}
        />
        <PreferenceSwitch
          checked={settings.reduceDecorativeMotion}
          label={a.reduceDecorativeMotion}
          description={a.reduceDecorativeMotionHelp}
          onLabel={a.on}
          offLabel={a.off}
          disabled={!settings.sensoryComfort}
          onChange={(reduceDecorativeMotion) => setSettings({ reduceDecorativeMotion })}
        />
        <PreferenceSwitch
          checked={settings.calmMeters}
          label={a.calmMeters}
          description={a.calmMetersHelp}
          onLabel={a.on}
          offLabel={a.off}
          disabled={!settings.sensoryComfort}
          onChange={(calmMeters) => setSettings({ calmMeters })}
        />
        <PreferenceSwitch
          checked={settings.calmSpectrum}
          label={a.calmSpectrum}
          description={a.calmSpectrumHelp}
          onLabel={a.on}
          offLabel={a.off}
          disabled={!settings.sensoryComfort}
          onChange={(calmSpectrum) => setSettings({ calmSpectrum })}
        />
        <PreferenceSwitch
          checked={settings.reduceVisualEffects}
          label={a.reduceVisualEffects}
          description={a.reduceVisualEffectsHelp}
          onLabel={a.on}
          offLabel={a.off}
          disabled={!settings.sensoryComfort}
          onChange={(reduceVisualEffects) => setSettings({ reduceVisualEffects })}
        />
        <PreferenceSwitch
          checked={settings.quietNotifications}
          label={a.quietNotifications}
          description={a.quietNotificationsHelp}
          onLabel={a.on}
          offLabel={a.off}
          disabled={!settings.sensoryComfort}
          onChange={(quietNotifications) => setSettings({ quietNotifications })}
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
