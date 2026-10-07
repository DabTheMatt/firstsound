import { useEffect, useState, type ReactNode } from 'react'
import { SPECTRUM_RESOLUTION_CHOICES, clampSpectrumResolution } from '../../audio/engine/analyserBudget'
import { EQ_CHANNEL_MODES, type EqChannelMode } from '../../audio/engine/eqGraph'
import {
  clampEqOverlayFocus,
  eqOverlayOptions,
  loadEqOverlayFocus,
  persistEqOverlayFocus,
  subscribeEqOverlayFocus,
} from '../../audio/engine/eqOverlayFocus'
import {
  SPECTRUM_BAND_CHOICES,
  SPECTRUM_FALL_MODES,
  SPECTRUM_FOLLOW_MODES,
  SPECTRUM_RANGE_CHOICES,
  clampSpectrumBandCount,
  clampSpectrumFallMode,
  clampSpectrumFollowMode,
  clampSpectrumRange,
} from '../../audio/engine/spectrumBands'
import {
  SPECTRAL_COLOR_MODES,
  SPECTRAL_DENSITIES,
  SPECTRAL_HISTORY_SECONDS,
  clampSpectralHistorySeconds,
  requestSpectralHistoryClear,
  requestSpectralViewReset,
  setSpectralHistoryFrozen,
  spectralHistorySession,
  subscribeSpectralHistorySession,
  type SpectralCameraPreset,
  type SpectralColorMode,
  type SpectralDensity,
  type SpectralDrawStyle,
} from '../../audio/engine/spectralHistory'
import {
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { spectrumListenId } from '../../audio/spectral/bands'
import { spectralBandsEnabled } from '../../audio/spectral/ui'
import { Segmented } from '../controls/Segmented'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import panel from '../inspector/Inspector.module.css'
import { SpectrumDisplaySettings } from './SpectrumDisplaySettings'
import styles from './Workspace.module.css'

const VIEWS: { id: SpectralCameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'angled', label: 'Angled' },
  { id: 'top', label: 'Top' },
]

const COLOR_LABEL: Record<SpectralColorMode, string> = {
  off: 'Off',
  level: 'Level',
  frequency: 'Frequency',
}

/** Analyzer options in the same fields other inspectors use. Layer stays on the FFT bar. */
export function AnalyzerSettingsMenu() {
  const { t } = useI18n()
  const snap = useEngine()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [overlay, setOverlay] = useState<string>(() => loadEqOverlayFocus())
  const [frozen, setFrozen] = useState(() => spectralHistorySession().frozen)
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(() => subscribeEqOverlayFocus(setOverlay), [])
  useEffect(
    () =>
      subscribeSpectralHistorySession(() => {
        setFrozen(spectralHistorySession().frozen)
      }),
    [],
  )

  const patch = (next: Partial<SpectrumPrefs>) => {
    patchSpectrumPrefs(next)
  }
  const eqs = snap.chain.filter((mod) => mod.type === 'eq')
  const overlayValue = clampEqOverlayFocus(overlay, snap.chain)
  const listenBand = spectrumListenId(snap.spectral.enabled, snap.spectral.analyser)

  return (
    <div className={panel.panel}>
      <h2 className={`${panel.title} ${styles.analyzerHeading}`}>History</h2>
      <div className={panel.stack}>
        <ChoiceField
          label="Time"
          value={String(prefs.historySec)}
          options={SPECTRAL_HISTORY_SECONDS.map((sec) => ({ id: String(sec), label: `${sec}s` }))}
          onChange={(id) => patch({ historySec: clampSpectralHistorySeconds(Number(id)) })}
        />
        <ChoiceField
          label="View"
          value={prefs.cameraPreset}
          options={VIEWS}
          onChange={(id) => patch({ cameraPreset: id })}
        />
        <ChoiceField
          label="Freeze"
          value={frozen ? 'on' : 'off'}
          options={[
            { id: 'off', label: 'Off' },
            { id: 'on', label: 'On', title: 'Freeze history. Audio keeps playing.' },
          ]}
          onChange={(id) => setSpectralHistoryFrozen(id === 'on')}
        />
      </div>

      <h2 className={`${panel.title} ${styles.analyzerHeading}`}>Picture</h2>
      <div className={panel.stack}>
        <ChoiceField
          label="Density"
          value={prefs.density}
          options={SPECTRAL_DENSITIES.map((density) => ({
            id: density,
            label: density === 'auto' ? 'Auto' : density === 'low' ? 'Low' : density === 'high' ? 'High' : 'Normal',
          }))}
          onChange={(id) => patch({ density: id as SpectralDensity })}
        />
        <ChoiceField
          label="Draw"
          value={prefs.drawStyle}
          options={[
            { id: 'lines' as const, label: 'Lines' },
            { id: 'surface' as const, label: 'Surface' },
          ]}
          onChange={(id) => patch({ drawStyle: id as SpectralDrawStyle })}
        />
        <ChoiceField
          label="Color"
          value={prefs.colorMode}
          options={SPECTRAL_COLOR_MODES.map((mode) => ({ id: mode, label: COLOR_LABEL[mode] }))}
          onChange={(id) =>
            patch({
              colorMode: id,
              regionColors: id === 'off' ? false : id === 'frequency' ? true : prefs.regionColors,
            })
          }
        />
        <ChoiceField
          label="Trails"
          value={prefs.peakTrails ? 'on' : 'off'}
          options={[
            { id: 'off', label: 'Off' },
            { id: 'on', label: 'On' },
          ]}
          onChange={(id) => patch({ peakTrails: id === 'on' })}
        />
        <div className={panel.row}>
          <button
            type="button"
            className={panel.ghost}
            onClick={() => {
              patch({ cameraPreset: 'angled' })
              requestSpectralViewReset()
            }}
          >
            Reset view
          </button>
          <button type="button" className={panel.ghost} onClick={() => requestSpectralHistoryClear()}>
            Clear history
          </button>
        </div>
      </div>

      <h2 className={`${panel.title} ${styles.analyzerHeading}`}>Analyzer</h2>
      <div className={panel.stack}>
        {spectralBandsEnabled && listenBand ? (
          <p className={styles.analyzerNote}>{t.waveform.spectral.analyseBand}</p>
        ) : null}
        <SelectField
          label="Range"
          value={String(prefs.range)}
          onChange={(value) => patch({ range: clampSpectrumRange(Number(value)) })}
        >
          {SPECTRUM_RANGE_CHOICES.map((db) => (
            <option key={db} value={db}>
              {db} dB
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Columns"
          value={String(prefs.bands)}
          onChange={(value) => patch({ bands: clampSpectrumBandCount(Number(value)) })}
        >
          {SPECTRUM_BAND_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="FFT"
          value={String(prefs.resolution)}
          onChange={(value) => patch({ resolution: clampSpectrumResolution(Number(value)) })}
        >
          {SPECTRUM_RESOLUTION_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>
        <ChoiceField
          label="Fall"
          value={prefs.fall}
          options={SPECTRUM_FALL_MODES.map((mode) => ({
            id: mode,
            label: mode === 'slow' ? 'Slow' : mode === 'fast' ? 'Fast' : 'Normal',
          }))}
          onChange={(id) => patch({ fall: clampSpectrumFallMode(id) })}
        />
        <ChoiceField
          label="Follow"
          value={prefs.follow}
          options={SPECTRUM_FOLLOW_MODES.map((mode) => ({
            id: mode,
            label: mode === 'peak' ? 'Peak' : mode === 'slow' ? 'Slow' : 'Both',
          }))}
          onChange={(id) => patch({ follow: clampSpectrumFollowMode(id) })}
        />
        <ChoiceField
          label="EQ ch"
          value={snap.eqChannelMode}
          options={EQ_CHANNEL_MODES.map((opt) => ({ id: opt.value, label: opt.label, title: opt.title }))}
          onChange={(id) => engine.setEqChannelMode(id as EqChannelMode)}
        />
        {eqs.length > 1 ? (
          <SelectField
            label="EQ"
            value={overlayValue}
            onChange={(value) => {
              const next = clampEqOverlayFocus(value, snap.chain)
              setOverlay(next)
              persistEqOverlayFocus(next)
            }}
          >
            {eqOverlayOptions(snap.chain).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>

      <h2 className={`${panel.title} ${styles.analyzerHeading}`}>Display</h2>
      <SpectrumDisplaySettings />
    </div>
  )
}

function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string; title?: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className={panel.field}>
      {label}
      <Segmented
        label={label}
        value={value}
        wrap
        options={options.map((opt) => ({ value: opt.id, label: opt.label, title: opt.title }))}
        onChange={onChange}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className={panel.field}>
      {label}
      <select className={panel.select} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}
