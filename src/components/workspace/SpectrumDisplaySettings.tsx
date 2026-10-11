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
import {
  SPECTRAL_COLOR_MODES,
  type SpectralColorMode,
} from '../../audio/engine/spectralHistory'
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
  eqColor: 'EQ graph only. Tints the spectrum columns by sub, bass, mids, presence, or air.',
  fftColor: 'FFT only. Off, Level, or Frequency. It paints the FFT bars, the FFT line, and the 3D ridges. It does not recolor the EQ graph.',
  nodes: 'EQ only. Each handle, the filter list, and the band name take the color of the frequency. FFT color does not change them.',
  eqChannel: 'EQ only. Shared uses one curve. Left and Right keep separate curves.',
  bars: 'Spectrum columns. Off leaves the outline, when Line is on.',
  line: 'Spectrum outline drawn over the columns.',
  legend: 'Color key. Names the region colors, or what the bars and the line are. On the EQ graph this sits at the lower left.',
  guides: 'Frequency landmarks. Hover the graph to read what usually lives there, such as kick boom, voice, snare crack, or air.',
  holdLength: 'How long that fragment is. 0.05 s, 0.1 s, 0.25 s, 0.5 s, or 1 s. Changing it while Hold is on restarts the loop at the new length.',
} as const

const FFT_COLOR_LABEL: Record<SpectralColorMode, string> = {
  off: 'Off',
  level: 'Level',
  frequency: 'Frequency',
}

type Props = {
  /** Which graph these rows edit. EQ and FFT keep separate values. */
  surface: GraphSurface
}

/**
 * The same display rows on the EQ graph and the FFT menu.
 * Each surface stores its own values.
 */
export function SpectrumDisplaySettings({ surface }: Props) {
  const snap = useEngine()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  const display = prefs.surfaces[surface]
  const paint = (patch: Partial<SurfaceDisplay>) => {
    patchSurfaceDisplay(surface, patch)
  }

  return (
    <div className={styles.displayRows}>
      <ChoiceRow label="Grid" hint={HINTS.grid}>
        {FREQ_GRID_DENSITIES.map((density) => (
          <Choice key={density} pressed={display.grid === density} onClick={() => paint({ grid: density })}>
            {density}
          </Choice>
        ))}
      </ChoiceRow>
      <ChoiceRow label="Layer" hint={HINTS.layer}>
        {LAYERS.map((layer) => (
          <Choice key={layer.id} pressed={display.layer === layer.id} onClick={() => paint({ layer: layer.id })}>
            {layer.label}
          </Choice>
        ))}
      </ChoiceRow>
      <ChoiceRow label="Scale" hint={HINTS.scale}>
        {FREQ_SCALE_OPTIONS.map((opt) => (
          <Choice key={opt.value} pressed={display.scale === opt.value} onClick={() => paint({ scale: opt.value })}>
            {opt.label}
          </Choice>
        ))}
      </ChoiceRow>
      <ChoiceRow label="Range" hint={HINTS.range}>
        {SPECTRUM_RANGE_CHOICES.map((db) => (
          <Choice key={db} pressed={display.range === db} onClick={() => paint({ range: clampSpectrumRange(db) })}>
            {db}
          </Choice>
        ))}
      </ChoiceRow>
      {surface === 'fft' ? (
        <ChoiceRow label="Color" hint={HINTS.fftColor}>
          {SPECTRAL_COLOR_MODES.map((mode) => (
            <Choice
              key={mode}
              pressed={prefs.colorMode === mode}
              onClick={() => patchSpectrumPrefs({ colorMode: mode })}
            >
              {FFT_COLOR_LABEL[mode]}
            </Choice>
          ))}
        </ChoiceRow>
      ) : (
        <>
          <OnOff
            label="Color"
            hint={HINTS.eqColor}
            on={display.regionColors}
            onChange={(regionColors) => paint({ regionColors })}
          />
          <OnOff
            label="Freq nodes"
            hint={HINTS.nodes}
            on={display.eqFreqColors}
            onChange={(eqFreqColors) => paint({ eqFreqColors })}
          />
          <ChoiceRow label="EQ ch" hint={HINTS.eqChannel}>
            {EQ_CHANNEL_MODES.map((opt) => (
              <Choice
                key={opt.value}
                pressed={snap.eqChannelMode === opt.value}
                title={opt.title}
                onClick={() => engine.setEqChannelMode(opt.value as EqChannelMode)}
              >
                {opt.label}
              </Choice>
            ))}
          </ChoiceRow>
        </>
      )}
      <OnOff label="Bars" hint={HINTS.bars} on={display.showBars} onChange={(showBars) => paint({ showBars })} />
      <OnOff label="Line" hint={HINTS.line} on={display.showLine} onChange={(showLine) => paint({ showLine })} />
      <OnOff
        label="Legend"
        hint={HINTS.legend}
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
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  return (
    <OnOff
      label="Guides"
      hint={HINTS.guides}
      on={prefs.surfaces[surface].freqGuide}
      onChange={(freqGuide) => patchSurfaceDisplay(surface, { freqGuide })}
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
  const [span, setSpan] = useState<AuditionSpanSec>(() => auditionSpanSec())
  useEffect(() => subscribeAuditionSpan(setSpan), [])
  return (
    <>
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
