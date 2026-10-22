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
import { requestLayoutRestore } from './predictableLayout'
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
  explain?: string
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
  explain,
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
        title={extraDescription ? `${description} ${extraDescription}` : description}
        data-explain={explain}
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
  explain?: string
  onChange: (next: number) => void
}

function ScalePreference({ label, description, value, min, max, presets, explain, onChange }: ScaleProps) {
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
          title={description}
          data-explain={explain}
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
  explain,
  onChange,
}: {
  label: string
  description: string
  value: AttentionStrength
  subtle: string
  clear: string
  explain?: string
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
      <div className={styles.choices} role="radiogroup" aria-labelledby={labelId} aria-describedby={helpId} data-explain={explain}>
        <button type="button" className={styles.strength} role="radio" aria-checked={value === 'subtle'} title={description} onClick={() => onChange('subtle')}>
          {subtle}
        </button>
        <button type="button" className={styles.strength} role="radio" aria-checked={value === 'clear'} title={description} onClick={() => onChange('clear')}>
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
  disabled?: boolean
  explain?: string
  onChange: (next: VisualActivity) => void
}

function VisualActivityChoice({
  label,
  description,
  standardLabel,
  lowLabel,
  value,
  disabled = false,
  explain,
  onChange,
}: ActivityProps) {
  const name = useId()
  const helpId = useId()
  return (
    <fieldset className={styles.choice} disabled={disabled} aria-describedby={helpId} data-explain={explain}>
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
            title={description}
            onChange={() => onChange('standard')}
          />
          {standardLabel}
        </label>
        <label className={styles.choiceLabel}>
          <input type="radio" name={name} value="low" checked={value === 'low'} title={description} onChange={() => onChange('low')} />
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
    <section className={styles.section} aria-labelledby="field-access-title" data-explain-scope="">
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
          explain="a11y.interfaceSize"
          onChange={(interfaceScale) => setSettings({ interfaceScale })}
        />
        <ScalePreference
          label={a.textSize}
          description={a.textSizeHelp}
          value={settings.textScale}
          min={TEXT_SCALE_MIN}
          max={TEXT_SCALE_MAX}
          presets={TEXT_SCALE_PRESETS}
          explain="a11y.textSize"
          onChange={(textScale) => setSettings({ textScale })}
        />
        <PreferenceSwitch
          checked={settings.highVisibility}
          label={a.highVisibility}
          description={a.highVisibilityHelp}
          explain="a11y.highVisibility"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(highVisibility) => setSettings({ highVisibility })}
        />
        <PreferenceSwitch
          checked={settings.reduceMotion}
          label={a.reduceMotion}
          description={a.reducedMotionHelp}
          extraDescription={a.reducedMotionSystem}
          explain="a11y.reduceMotion"
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
          explain="a11y.attentionFocus"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(attentionFocus) => setSettings({ attentionFocus })}
        />
        <StrengthChoice
          label={a.attentionStrength}
          description={a.attentionStrengthHelp}
          value={settings.attentionStrength}
          subtle={a.attentionSubtle}
          clear={a.attentionClear}
          explain="a11y.attentionStrength"
          onChange={(attentionStrength) => setSettings({ attentionStrength })}
        />
        <PreferenceSwitch
          checked={settings.attentionHighlight}
          label={a.attentionHighlight}
          description={a.attentionHighlightHelp}
          explain="a11y.attentionHighlight"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(attentionHighlight) => setSettings({ attentionHighlight })}
        />
        <PreferenceSwitch
          checked={settings.attentionReduce}
          label={a.attentionReduce}
          description={a.attentionReduceHelp}
          explain="a11y.attentionReduce"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(attentionReduce) => setSettings({ attentionReduce })}
        />
        <PreferenceSwitch
          checked={settings.predictableLayout}
          label={a.predictableLayout}
          description={a.predictableLayoutHelp}
          explain="a11y.predictableLayout"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(predictableLayout) => setSettings({ predictableLayout })}
        />
        <PreferenceSwitch
          checked={settings.stablePanels}
          label={a.stablePanels}
          description={a.stablePanelsHelp}
          explain="a11y.stablePanels"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(stablePanels) => setSettings({ stablePanels })}
        />
        <PreferenceSwitch
          checked={settings.rememberWorkspaceLayout}
          label={a.rememberLayout}
          description={a.rememberLayoutHelp}
          explain="a11y.rememberLayout"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(rememberWorkspaceLayout) => setSettings({ rememberWorkspaceLayout })}
        />
        <PreferenceSwitch
          checked={settings.reduceLayoutMovement}
          label={a.reduceLayout}
          description={a.reduceLayoutHelp}
          explain="a11y.reduceLayout"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(reduceLayoutMovement) => setSettings({ reduceLayoutMovement })}
        />
        <p className={styles.help}>{a.restoreLayoutHelp}</p>
        <button
          type="button"
          className={styles.restore}
          title={a.restoreLayoutHelp}
          data-explain="a11y.restoreLayout"
          onClick={() => {
            requestLayoutRestore()
            announce(a.layoutRestored)
          }}
        >
          {a.restoreLayout}
        </button>
      </div>

      <div>
        <h3 className={styles.group}>{a.sensoryComfortSection}</h3>
        <PreferenceSwitch
          checked={settings.sensoryComfort}
          label={a.sensoryComfort}
          description={a.sensoryComfortHelp}
          explain="a11y.sensoryComfort"
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
          explain="a11y.visualActivity"
          onChange={(visualActivity) => setSettings({ visualActivity })}
        />
        <PreferenceSwitch
          checked={settings.reduceDecorativeMotion}
          label={a.reduceDecorativeMotion}
          description={a.reduceDecorativeMotionHelp}
          explain="a11y.reduceDecorativeMotion"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(reduceDecorativeMotion) => setSettings({ reduceDecorativeMotion })}
        />
        <PreferenceSwitch
          checked={settings.calmMeters}
          label={a.calmMeters}
          description={a.calmMetersHelp}
          explain="a11y.calmMeters"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(calmMeters) => setSettings({ calmMeters })}
        />
        <PreferenceSwitch
          checked={settings.calmSpectrum}
          label={a.calmSpectrum}
          description={a.calmSpectrumHelp}
          explain="a11y.calmSpectrum"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(calmSpectrum) => setSettings({ calmSpectrum })}
        />
        <PreferenceSwitch
          checked={settings.reduceVisualEffects}
          label={a.reduceVisualEffects}
          description={a.reduceVisualEffectsHelp}
          explain="a11y.reduceVisualEffects"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(reduceVisualEffects) => setSettings({ reduceVisualEffects })}
        />
        <PreferenceSwitch
          checked={settings.quietNotifications}
          label={a.quietNotifications}
          description={a.quietNotificationsHelp}
          explain="a11y.quietNotifications"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(quietNotifications) => setSettings({ quietNotifications })}
        />
      </div>

      <div>
        <h3 className={styles.group}>{a.interaction}</h3>
        <PreferenceSwitch
          checked={settings.enhancedFocus}
          label={a.focus}
          description={a.focusHelp}
          explain="a11y.focus"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(enhancedFocus) => setSettings({ enhancedFocus })}
        />
        <PreferenceSwitch
          checked={settings.largerInterface}
          label={a.larger}
          description={a.largerHelp}
          explain="a11y.larger"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(largerInterface) => setSettings({ largerInterface })}
        />
        <PreferenceSwitch
          checked={settings.dragFreeEditing}
          label={a.dragFree}
          description={a.dragFreeHelp}
          explain="a11y.dragFree"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(dragFreeEditing) => setSettings({ dragFreeEditing })}
        />
        <PreferenceSwitch
          checked={settings.keyboardFirst}
          label={a.keyboardFirst}
          description={a.keyboardFirstHelp}
          explain="a11y.keyboardFirst"
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
          explain="a11y.waveformNav"
          onLabel={a.on}
          offLabel={a.off}
          onChange={(accessibleWaveform) => setSettings({ accessibleWaveform })}
        />
      </div>

      <p className={styles.saved}>{a.saved}</p>
      <button type="button" className={styles.restore} title={a.restoreHelp} data-explain="a11y.restore" onClick={restore}>
        {a.restore}
      </button>

      <details className={styles.more}>
        <summary>{a.more}</summary>
        <label className={styles.check} data-explain="a11y.lowVision">
          <input
            type="checkbox"
            checked={settings.lowVision}
            title={a.themeHelp}
            onChange={(event) => setSettings({ lowVision: event.target.checked })}
          />
          <span>{a.theme}</span>
        </label>
        <p className={styles.help}>{a.themeHelp}</p>
        <label className={styles.check} data-explain="a11y.tips">
          <input
            type="checkbox"
            checked={settings.showDescriptions}
            title={a.tipsHelp}
            onChange={(event) => setSettings({ showDescriptions: event.target.checked })}
          />
          <span>{a.tips}</span>
        </label>
        <p className={styles.help}>{a.tipsHelp}</p>
        <label className={styles.check} data-explain="a11y.screenReader">
          <input
            type="checkbox"
            checked={settings.screenReaderOptimizations}
            title={a.srHelp}
            onChange={(event) => setSettings({ screenReaderOptimizations: event.target.checked })}
          />
          <span>{a.sr}</span>
        </label>
        <p className={styles.help}>{a.srHelp}</p>
        <label className={styles.check} data-explain="a11y.shortcuts">
          <input
            type="checkbox"
            checked={settings.shortcutsEnabled}
            title={a.shortcutsHelp}
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
