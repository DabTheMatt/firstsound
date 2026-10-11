import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FloatingTip } from '../../a11y/FloatingTip'
import {
  FREQ_GRID_DENSITIES,
  loadFreqGridDensity,
  persistFreqGridDensity,
  subscribeFreqGridDensity,
  type FreqGridDensity,
} from '../../audio/engine/freqGrid'
import {
  FREQ_SCALE_OPTIONS,
  loadFreqScale,
  persistFreqScale,
  subscribeFreqScale,
  type FreqScaleKind,
} from '../../audio/engine/freqScale'
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
import {
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { analyzerCopy } from '../../i18n/analyzerCopy'
import styles from './Workspace.module.css'

type Props = {
  /** EQ graph has no Before / After / Both bar, so the row lives with the other display settings. */
  showLayer?: boolean
  /** EQ color rows. The FFT menu keeps its own Off / Level / Frequency control. */
  eqColor?: boolean
}

/**
 * Grid, scale, and spectrum drawing options.
 * The FFT inspector and the EQ graph use this same row list.
 */
export function SpectrumDisplaySettings({ showLayer = false, eqColor = false }: Props) {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [scale, setScale] = useState<FreqScaleKind>(() => loadFreqScale())
  const [grid, setGrid] = useState<FreqGridDensity>(() => loadFreqGridDensity())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(() => subscribeFreqScale(setScale), [])
  useEffect(() => subscribeFreqGridDensity(setGrid), [])

  const patch = (next: Partial<SpectrumPrefs>) => {
    patchSpectrumPrefs(next)
  }

  return (
    <div className={styles.displayRows}>
      <ChoiceRow label={copy.grid} hint={copy.gridHint}>
        {FREQ_GRID_DENSITIES.map((density) => (
          <Choice
            key={density}
            pressed={grid === density}
            onClick={() => {
              setGrid(density)
              persistFreqGridDensity(density)
            }}
          >
            {density}
          </Choice>
        ))}
      </ChoiceRow>
      {showLayer ? (
        <ChoiceRow label={copy.layer} hint={copy.layerHint}>
          {(['pre', 'post', 'both'] as const).map((id) => (
            <Choice
              key={id}
              pressed={prefs.layer === id}
              onClick={() => patch({ layer: id, historyLayer: id })}
            >
              {id === 'pre' ? copy.before : id === 'post' ? copy.after : copy.both}
            </Choice>
          ))}
        </ChoiceRow>
      ) : null}
      <ChoiceRow label={copy.scale} hint={copy.scaleHint}>
        {FREQ_SCALE_OPTIONS.map((opt) => (
          <Choice
            key={opt.value}
            pressed={scale === opt.value}
            title={opt.value === 'log' ? copy.scaleLog : opt.value === 'linear' ? copy.scaleLin : copy.scaleMel}
            onClick={() => {
              setScale(opt.value)
              persistFreqScale(opt.value)
            }}
          >
            {opt.label}
          </Choice>
        ))}
      </ChoiceRow>
      {showLayer ? (
        <ChoiceRow label={copy.range} hint={copy.rangeHint}>
          {SPECTRUM_RANGE_CHOICES.map((db) => (
            <Choice
              key={db}
              pressed={prefs.range === db}
              onClick={() => patch({ range: clampSpectrumRange(db) })}
            >
              {db}
            </Choice>
          ))}
        </ChoiceRow>
      ) : null}
      {eqColor ? (
        <>
          <OnOff
            label={copy.color}
            hint={copy.colorHint}
            on={prefs.regionColors}
            onChange={(regionColors) => patch({ regionColors })}
          />
          <OnOff
            label={copy.nodes}
            hint={copy.nodesHint}
            on={prefs.eqFreqColors}
            onChange={(eqFreqColors) => patch({ eqFreqColors })}
          />
          <OnOff
            label={copy.regions}
            hint={copy.regionsHint}
            on={prefs.regionColors}
            onChange={(regionColors) => patch({ regionColors })}
          />
        </>
      ) : null}
      <OnOff label={copy.bars} hint={copy.barsHint} on={prefs.showBars} onChange={(showBars) => patch({ showBars })} />
      <OnOff label={copy.line} hint={copy.lineHint} on={prefs.showLine} onChange={(showLine) => patch({ showLine })} />
      <OnOff
        label={copy.legend}
        hint={copy.legendHint}
        on={prefs.legendOpen}
        onChange={(legendOpen) => patch({ legendOpen })}
      />
      <GuidesRow />
      <SnapshotRow />
    </div>
  )
}

/** One-click hold, shared by the graph menu button and the settings row. */
export function holdGraphSnapshot(on: boolean): void {
  setGraphSnapshot(on)
  engine.holdAudition(on)
}

export function GuidesRow() {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  return (
    <OnOff
      label={copy.guides}
      hint={copy.guidesHint}
      on={prefs.freqGuide}
      onChange={(freqGuide) => patchSpectrumPrefs({ freqGuide })}
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
      on={prefs.eqFreqColors}
      onChange={(eqFreqColors) => patchSpectrumPrefs({ eqFreqColors })}
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
