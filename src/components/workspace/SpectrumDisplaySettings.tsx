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
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { engine } from '../../hooks/useEngine'
import styles from './Workspace.module.css'

const LAYERS: { id: SpectrumLayer; label: string }[] = [
  { id: 'pre', label: 'Before' },
  { id: 'post', label: 'After' },
  { id: 'both', label: 'Both' },
]

const HINTS = {
  grid: 'Vertical guides. 6, 12, or 24 frequency lines across the graph.',
  layer: 'Which spectrum to draw. Before is the input of the chain. After is the output. Both draws them together.',
  scale: 'How frequency is spaced. Log is the usual musical spacing. Lin is even in hertz. Mel follows hearing.',
  range: 'How far down the spectrum bars reach, from 0 dB. The EQ curve keeps its own scale, from −24 dB to +24 dB.',
  color: 'EQ graph only. Paints those spectrum columns by frequency region. FFT color stays where you set it.',
  nodes: 'EQ only. Each handle, the filter list, and the band name take the color of the frequency. FFT color does not change them.',
  regions: 'EQ graph only. Tints each spectrum column by sub, bass, mids, presence, or air. FFT color is a separate setting.',
  bars: 'Spectrum columns. Off leaves the outline, when Line is on.',
  line: 'Spectrum outline drawn over the columns.',
  legend: 'Color key. Names the region colors, or what the bars and the line are. On the EQ graph this sits at the lower left.',
  guides: 'Frequency landmarks. Hover the graph to read what usually lives there, such as kick boom, voice, snare crack, or air.',
  snapshot: 'Loops a short fragment of the sample. The FFT and EQ graphs keep drawing that loop, including each repeat. Press again to play on from that place.',
  holdLength: 'How long that fragment is. 0.25 s, 0.5 s, or 1 s. Changing it while Hold is on restarts the loop at the new length.',
} as const

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
      <ChoiceRow label="Grid" hint={HINTS.grid}>
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
        <ChoiceRow label="Layer" hint={HINTS.layer}>
          {LAYERS.map((layer) => (
            <Choice
              key={layer.id}
              pressed={prefs.layer === layer.id}
              onClick={() => patch({ layer: layer.id, historyLayer: layer.id })}
            >
              {layer.label}
            </Choice>
          ))}
        </ChoiceRow>
      ) : null}
      <ChoiceRow label="Scale" hint={HINTS.scale}>
        {FREQ_SCALE_OPTIONS.map((opt) => (
          <Choice
            key={opt.value}
            pressed={scale === opt.value}
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
        <ChoiceRow label="Range" hint={HINTS.range}>
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
            label="Color"
            hint={HINTS.color}
            on={prefs.regionColors}
            onChange={(regionColors) => patch({ regionColors })}
          />
          <OnOff
            label="Freq nodes"
            hint={HINTS.nodes}
            on={prefs.eqFreqColors}
            onChange={(eqFreqColors) => patch({ eqFreqColors })}
          />
          <OnOff
            label="Regions"
            hint={HINTS.regions}
            on={prefs.regionColors}
            onChange={(regionColors) => patch({ regionColors })}
          />
        </>
      ) : null}
      <OnOff label="Bars" hint={HINTS.bars} on={prefs.showBars} onChange={(showBars) => patch({ showBars })} />
      <OnOff label="Line" hint={HINTS.line} on={prefs.showLine} onChange={(showLine) => patch({ showLine })} />
      <OnOff
        label="Legend"
        hint={HINTS.legend}
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
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  return (
    <OnOff
      label="Guides"
      hint={HINTS.guides}
      on={prefs.freqGuide}
      onChange={(freqGuide) => patchSpectrumPrefs({ freqGuide })}
    />
  )
}

/** Frequency hue for the handles, the filter list, and the band name. */
export function FreqNodesRow() {
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  return (
    <OnOff
      label="Freq nodes"
      hint={HINTS.nodes}
      on={prefs.eqFreqColors}
      onChange={(eqFreqColors) => patchSpectrumPrefs({ eqFreqColors })}
    />
  )
}

export function SnapshotRow() {
  const [on, setOn] = useState(() => graphSnapshotFrozen())
  const [span, setSpan] = useState<AuditionSpanSec>(() => auditionSpanSec())
  useEffect(() => subscribeGraphSnapshot(setOn), [])
  useEffect(() => subscribeAuditionSpan(setSpan), [])
  return (
    <>
      <OnOff
        label="Hold"
        hint={HINTS.snapshot}
        on={on}
        onChange={(next) => {
          setOn(next)
          holdGraphSnapshot(next)
        }}
      />
      <ChoiceRow label="Length" hint={HINTS.holdLength}>
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
  return (
    <ChoiceRow label={label} hint={hint}>
      <Choice pressed={!on} onClick={() => onChange(false)}>
        Off
      </Choice>
      <Choice pressed={on} onClick={() => onChange(true)}>
        On
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
