import { useEffect, useId, useState, type ReactNode } from 'react'
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
  color: 'Paints the spectrum by frequency. Off uses one theme color.',
  nodes: 'Frequency-colored nodes. Each EQ handle takes the color of the frequency region it sits in.',
  regions: 'Region colors. Tints each spectrum column by sub, bass, mids, presence, or air. Off uses one color, unless Color is set to level.',
  bars: 'Spectrum columns. Off leaves the outline, when Line is on.',
  line: 'Spectrum outline drawn over the columns.',
  legend: 'Color key. Names the region colors, or what the bars and the line are. On the EQ graph this sits at the lower left.',
  guides: 'Frequency landmarks. Hover the graph to read what usually lives there, such as kick boom, voice, snare crack, or air.',
  snapshot: 'Loops a short fragment of the sample and holds the FFT and EQ graphs, so you can hear what you are looking at. Press again to play on from that place.',
} as const

type Props = {
  /** EQ graph has no Before / After / Both bar, so the row lives with the other display settings. */
  showLayer?: boolean
}

/**
 * Grid, scale, and spectrum drawing options.
 * The FFT inspector and the EQ graph use this same row list.
 */
export function SpectrumDisplaySettings({ showLayer = false }: Props) {
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
            title={HINTS.grid}
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
              title={HINTS.layer}
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
            title={opt.title || HINTS.scale}
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
              title={HINTS.range}
              onClick={() => patch({ range: clampSpectrumRange(db) })}
            >
              {db}
            </Choice>
          ))}
        </ChoiceRow>
      ) : null}
      <OnOff
        label="Color"
        hint={HINTS.color}
        on={prefs.regionColors || prefs.colorMode !== 'off'}
        onChange={(on) =>
          patch(
            on
              ? { regionColors: true, colorMode: prefs.colorMode === 'level' ? 'level' : 'frequency' }
              : { regionColors: false, colorMode: 'off' },
          )
        }
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

export function SnapshotRow() {
  const [on, setOn] = useState(() => graphSnapshotFrozen())
  useEffect(() => subscribeGraphSnapshot(setOn), [])
  return (
    <OnOff
      label="Hold"
      hint={HINTS.snapshot}
      on={on}
      onChange={(next) => {
        setOn(next)
        holdGraphSnapshot(next)
      }}
    />
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
      <Choice pressed={!on} title={hint} onClick={() => onChange(false)}>
        Off
      </Choice>
      <Choice pressed={on} title={hint} onClick={() => onChange(true)}>
        On
      </Choice>
    </ChoiceRow>
  )
}

function ChoiceRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const tipId = useId()
  return (
    <div className={styles.displayRow} role="group" aria-label={label}>
      <span className={styles.displayLabel} tabIndex={0} aria-describedby={tipId}>
        {label}
        <span className={styles.displayHint} id={tipId} role="tooltip">
          {hint}
        </span>
      </span>
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
