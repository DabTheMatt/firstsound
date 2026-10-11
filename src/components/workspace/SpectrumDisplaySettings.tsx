import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FloatingTip } from '../../a11y/FloatingTip'
import { FREQ_GRID_DENSITIES } from '../../audio/engine/freqGrid'
import { FREQ_SCALE_OPTIONS } from '../../audio/engine/freqScale'
import {
  AUDITION_SPAN_CHOICES,
  auditionSpanSec,
  setAuditionSpanSec,
  subscribeAuditionSpan,
  type AuditionSpanSec,
} from '../../audio/engine/auditionHold'
import {
  graphSnapshotFrozen,
  setGraphSnapshot,
  subscribeGraphSnapshot,
} from '../../audio/engine/graphSnapshot'
import {
  SPECTRUM_RANGE_CHOICES,
  clampSpectrumRange,
} from '../../audio/engine/spectrumBands'
import { EQ_CHANNEL_MODES, type EqChannelMode } from '../../audio/engine/eqGraph'
import { SPECTRAL_COLOR_MODES } from '../../audio/engine/spectralHistory'
import {
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  patchSurfaceDisplay,
  subscribeSpectrumPrefs,
  type GraphSurface,
  type SpectrumLayer,
  type SpectrumPrefs,
  type SurfaceDisplay,
} from '../../audio/engine/spectrumPrefs'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { analyzerCopy } from '../../i18n/analyzerCopy'
import styles from './Workspace.module.css'

const LAYER_IDS: SpectrumLayer[] = ['pre', 'post', 'both']

type Props = {
  /** Which graph these rows edit. EQ and FFT keep separate values. */
  surface: GraphSurface
}

/**
 * The same display rows on the EQ graph and the FFT menu.
 * Each surface stores its own values.
 */
export function SpectrumDisplaySettings({ surface }: Props) {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  const snap = useEngine()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  const display = prefs.surfaces[surface]
  const paint = (patch: Partial<SurfaceDisplay>) => {
    patchSurfaceDisplay(surface, patch)
  }

  return (
    <div className={styles.displayRows}>
      <ChoiceRow label={copy.grid} hint={copy.gridHint}>
        {FREQ_GRID_DENSITIES.map((density) => (
          <Choice key={density} pressed={display.grid === density} onClick={() => paint({ grid: density })}>
            {density}
          </Choice>
        ))}
      </ChoiceRow>
      <ChoiceRow label={copy.layer} hint={copy.layerHint}>
        {LAYER_IDS.map((id) => (
          <Choice key={id} pressed={display.layer === id} onClick={() => paint({ layer: id })}>
            {id === 'pre' ? copy.before : id === 'post' ? copy.after : copy.both}
          </Choice>
        ))}
      </ChoiceRow>
      <ChoiceRow label={copy.scale} hint={copy.scaleHint}>
        {FREQ_SCALE_OPTIONS.map((opt) => (
          <Choice key={opt.value} pressed={display.scale === opt.value} onClick={() => paint({ scale: opt.value })}>
            {opt.label}
          </Choice>
        ))}
      </ChoiceRow>
      <ChoiceRow label={copy.range} hint={copy.rangeHint}>
        {SPECTRUM_RANGE_CHOICES.map((db) => (
          <Choice key={db} pressed={display.range === db} onClick={() => paint({ range: clampSpectrumRange(db) })}>
            {db}
          </Choice>
        ))}
      </ChoiceRow>
      {surface === 'fft' ? (
        <ChoiceRow label={copy.color} hint={copy.fftColorHint}>
          {SPECTRAL_COLOR_MODES.map((mode) => (
            <Choice
              key={mode}
              pressed={prefs.colorMode === mode}
              onClick={() => patchSpectrumPrefs({ colorMode: mode })}
            >
              {mode === 'off' ? copy.off : mode === 'level' ? copy.level : copy.frequency}
            </Choice>
          ))}
        </ChoiceRow>
      ) : (
        <>
          <OnOff
            label={copy.color}
            hint={copy.colorHint}
            on={display.regionColors}
            onChange={(regionColors) => paint({ regionColors })}
          />
          <OnOff
            label={copy.nodes}
            hint={copy.nodesHint}
            on={display.eqFreqColors}
            onChange={(eqFreqColors) => paint({ eqFreqColors })}
          />
          <ChoiceRow label={copy.eqChannel} hint={copy.eqChannelTitle}>
            {EQ_CHANNEL_MODES.map((opt) => (
              <Choice
                key={opt.value}
                pressed={snap.eqChannelMode === opt.value}
                title={opt.value === 'shared' ? copy.sharedHint : opt.value === 'left' ? copy.leftHint : copy.rightHint}
                onClick={() => engine.setEqChannelMode(opt.value as EqChannelMode)}
              >
                {opt.value === 'shared' ? copy.shared : opt.value === 'left' ? copy.left : copy.right}
              </Choice>
            ))}
          </ChoiceRow>
        </>
      )}
      <OnOff label={copy.bars} hint={copy.barsHint} on={display.showBars} onChange={(showBars) => paint({ showBars })} />
      <OnOff label={copy.line} hint={copy.lineHint} on={display.showLine} onChange={(showLine) => paint({ showLine })} />
      <OnOff
        label={copy.legend}
        hint={copy.legendHint}
        on={display.legendOpen}
        onChange={(legendOpen) => paint({ legendOpen })}
      />
      <GuidesRow surface={surface} />
      <SnapshotRow />
    </div>
  )
}

/** One-click hold, shared by the graph menu button and the settings row. */
export function holdGraphSnapshot(on: boolean): void {
  setGraphSnapshot(on)
  engine.holdAudition(on)
}

export function GuidesRow({ surface }: { surface: GraphSurface }) {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  return (
    <OnOff
      label={copy.guides}
      hint={copy.guidesHint}
      on={prefs.surfaces[surface].freqGuide}
      onChange={(freqGuide) => patchSurfaceDisplay(surface, { freqGuide })}
    />
  )
}

/** Frequency hue for the handles, the filter list, and the band name. */
export function FreqNodesRow() {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  return (
    <OnOff
      label={copy.nodes}
      hint={copy.nodesHint}
      on={prefs.surfaces.eq.eqFreqColors}
      onChange={(eqFreqColors) => patchSurfaceDisplay('eq', { eqFreqColors })}
    />
  )
}

/** Hold stays a button beside the menu. The menu only chooses the length. */
export function HoldGraphButton({
  className,
  pressedClassName,
}: {
  className: string
  pressedClassName: string
}) {
  const { t } = useI18n()
  const [on, setOn] = useState(() => graphSnapshotFrozen())
  useEffect(() => subscribeGraphSnapshot(setOn), [])
  return (
    <button
      type="button"
      className={on ? pressedClassName : className}
      data-geometry="square"
      data-hold-toggle=""
      aria-pressed={on}
      aria-label={on ? t.waveform.holdOn : t.waveform.holdOff}
      title={on ? t.waveform.holdOn : t.waveform.holdOff}
      onClick={(event) => {
        holdGraphSnapshot(!on)
        event.currentTarget.blur()
      }}
    >
      {t.waveform.hold}
    </button>
  )
}

export function SnapshotRow() {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  const [span, setSpan] = useState<AuditionSpanSec>(() => auditionSpanSec())
  useEffect(() => subscribeAuditionSpan(setSpan), [])
  return (
    <>
      <ChoiceRow label={copy.length} hint={copy.holdLengthHint}>
        {AUDITION_SPAN_CHOICES.map((choice) => (
          <Choice
            key={choice}
            pressed={span === choice}
            onClick={() => {
              setAuditionSpanSec(choice)
              setSpan(choice)
              if (graphSnapshotFrozen()) engine.holdAudition(true)
            }}
          >
            {choice}s
          </Choice>
        ))}
      </ChoiceRow>
    </>
  )
}

function OnOff({
  label,
  hint,
  on,
  onChange,
}: {
  label: string
  hint: string
  on: boolean
  onChange: (next: boolean) => void
}) {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  return (
    <ChoiceRow label={label} hint={hint}>
      <Choice pressed={!on} onClick={() => onChange(false)}>
        {copy.off}
      </Choice>
      <Choice pressed={on} onClick={() => onChange(true)}>
        {copy.on}
      </Choice>
    </ChoiceRow>
  )
}

function ChoiceRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const labelRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div
      className={styles.displayRow}
      role="group"
      aria-label={label}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        ref={labelRef}
        className={styles.displayLabel}
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </span>
      {open ? <FloatingTip anchorRef={labelRef} text={hint} /> : null}
      <div className={styles.displayChoices}>{children}</div>
    </div>
  )
}

function Choice({
  pressed,
  title,
  onClick,
  children,
}: {
  pressed: boolean
  title?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" aria-pressed={pressed} title={title} onClick={onClick}>
      {children}
    </button>
  )
}
