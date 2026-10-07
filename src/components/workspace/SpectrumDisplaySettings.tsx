import { useEffect, useState, type ReactNode } from 'react'
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
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import styles from './Workspace.module.css'

const LAYERS: { id: SpectrumLayer; label: string }[] = [
  { id: 'pre', label: 'Before' },
  { id: 'post', label: 'After' },
  { id: 'both', label: 'Both' },
]

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
      <ChoiceRow label="Grid">
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
        <ChoiceRow label="Layer">
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
      <ChoiceRow label="Scale">
        {FREQ_SCALE_OPTIONS.map((opt) => (
          <Choice
            key={opt.value}
            pressed={scale === opt.value}
            title={opt.title}
            onClick={() => {
              setScale(opt.value)
              persistFreqScale(opt.value)
            }}
          >
            {opt.label}
          </Choice>
        ))}
      </ChoiceRow>
      <OnOff
        label="Color"
        title="Color the spectrum by frequency. Off uses one theme color."
        on={prefs.regionColors || prefs.colorMode !== 'off'}
        onChange={(on) =>
          patch(
            on
              ? { regionColors: true, colorMode: prefs.colorMode === 'level' ? 'level' : 'frequency' }
              : { regionColors: false, colorMode: 'off' },
          )
        }
      />
      <OnOff label="Nodes" title="Color EQ nodes by frequency" on={prefs.eqFreqColors} onChange={(eqFreqColors) => patch({ eqFreqColors })} />
      <OnOff label="Regions" title="Color spectrum bands by region" on={prefs.regionColors} onChange={(regionColors) => patch({ regionColors })} />
      <OnOff label="Bars" title="Draw the spectrum columns" on={prefs.showBars} onChange={(showBars) => patch({ showBars })} />
      <OnOff label="Line" title="Draw the spectrum line" on={prefs.showLine} onChange={(showLine) => patch({ showLine })} />
      <OnOff label="Legend" title="Show the spectrum legend" on={prefs.legendOpen} onChange={(legendOpen) => patch({ legendOpen })} />
    </div>
  )
}

function OnOff({
  label,
  title,
  on,
  onChange,
}: {
  label: string
  title: string
  on: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <ChoiceRow label={label}>
      <Choice pressed={!on} title={title} onClick={() => onChange(false)}>
        Off
      </Choice>
      <Choice pressed={on} title={title} onClick={() => onChange(true)}>
        On
      </Choice>
    </ChoiceRow>
  )
}

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.displayRow} role="group" aria-label={label}>
      <span className={styles.displayLabel}>{label}</span>
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
