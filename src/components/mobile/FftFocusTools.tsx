import { useEffect, useState, type ReactNode } from 'react'
import { SPECTRUM_RESOLUTION_CHOICES, clampSpectrumResolution } from '../../audio/engine/analyserBudget'
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
import { EQ_CHANNEL_MODES, type EqChannelMode } from '../../audio/engine/eqGraph'
import {
  clampEqOverlayFocus,
  eqOverlayOptions,
  loadEqOverlayFocus,
  persistEqOverlayFocus,
  subscribeEqOverlayFocus,
} from '../../audio/engine/eqOverlayFocus'
import { FREQ_SCALE_OPTIONS, loadFreqScale, persistFreqScale, subscribeFreqScale, type FreqScaleKind } from '../../audio/engine/freqScale'
import {
  loadSpectrumPrefs,
  persistSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { spectrumListenId } from '../../audio/spectral/bands'
import { spectralBandsEnabled } from '../../audio/spectral/ui'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { FftViewToggle, SpectralHistoryControls } from '../waveform/SpectralHistoryControls'
import styles from './FocusChrome.module.css'

/** Analyzer controls for the Focus workspace zone. Same prefs as the spectrum chrome. */
export function FftFocusTools() {
  const { t } = useI18n()
  const snap = useEngine()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [scale, setScale] = useState<FreqScaleKind>(() => loadFreqScale())
  const [overlay, setOverlay] = useState<string>(() => loadEqOverlayFocus())
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(() => subscribeFreqScale(setScale), [])
  useEffect(() => subscribeEqOverlayFocus(setOverlay), [])

  const patch = (next: Partial<SpectrumPrefs>) => {
    persistSpectrumPrefs({ ...prefs, ...next })
  }
  const eqs = snap.chain.filter((mod) => mod.type === 'eq')
  const overlayValue = clampEqOverlayFocus(overlay, snap.chain)
  const listenBand = spectrumListenId(snap.spectral.enabled, snap.spectral.analyser)

  const spatial = prefs.viewMode === '3d'

  return (
    <div className={styles.fftTools} data-fft-focus="">
      {spatial ? <SpectralHistoryControls variant="focus" /> : null}
      {spatial ? null : <>
      {spectralBandsEnabled && listenBand ? (
        <span className={styles.fftNote}>
          {t.waveform.spectral.analyseBand}
        </span>
      ) : null}
      <Select
        label="Layer"
        value={prefs.layer}
        onChange={(value) => patch({ layer: value as SpectrumLayer })}
      >
        <option value="pre">Before</option>
        <option value="post">After</option>
        <option value="both">Both</option>
      </Select>
      <Select
        label="Range"
        value={String(prefs.range)}
        onChange={(value) => patch({ range: clampSpectrumRange(Number(value)) })}
      >
        {SPECTRUM_RANGE_CHOICES.map((db) => (
          <option key={db} value={db}>
            {db} dB
          </option>
        ))}
      </Select>
      <Select label="Scale" value={scale} onChange={(value) => persistFreqScale(value as FreqScaleKind)}>
        {FREQ_SCALE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Select
        label="Columns"
        value={String(prefs.bands)}
        onChange={(value) => patch({ bands: clampSpectrumBandCount(Number(value)) })}
      >
        {SPECTRUM_BAND_CHOICES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
      <Select
        label="FFT"
        value={String(prefs.resolution)}
        onChange={(value) => patch({ resolution: clampSpectrumResolution(Number(value)) })}
      >
        {SPECTRUM_RESOLUTION_CHOICES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
      <Select
        label="Fall"
        value={prefs.fall}
        onChange={(value) => patch({ fall: clampSpectrumFallMode(value) })}
      >
        {SPECTRUM_FALL_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode === 'slow' ? 'Slow' : mode === 'fast' ? 'Fast' : 'Normal'}
          </option>
        ))}
      </Select>
      <Select
        label="Follow"
        value={prefs.follow}
        onChange={(value) => patch({ follow: clampSpectrumFollowMode(value) })}
      >
        {SPECTRUM_FOLLOW_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode === 'peak' ? 'Peak' : mode === 'slow' ? 'Slow' : 'Both'}
          </option>
        ))}
      </Select>
      <Select
        label="EQ ch"
        value={snap.eqChannelMode}
        onChange={(value) => engine.setEqChannelMode(value as EqChannelMode)}
      >
        {EQ_CHANNEL_MODES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      {eqs.length > 1 ? (
        <Select
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
        </Select>
      ) : null}
      </>}
      <div className={styles.fftTail}>
      {spatial ? null : <div className={styles.fftIcons}>
        <Icon
          pressed={prefs.eqFreqColors}
          label={prefs.eqFreqColors ? 'Frequency colors on' : 'Frequency colors off'}
          onClick={() => patch({ eqFreqColors: !prefs.eqFreqColors })}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="4" cy="8" r="2.2" fill="#d97706" />
            <circle cx="8" cy="8" r="2.2" fill="#16a34a" />
            <circle cx="12" cy="8" r="2.2" fill="#7c3aed" />
          </svg>
        </Icon>
        <Icon
          pressed={prefs.regionColors}
          label={prefs.regionColors ? 'Use solid band color' : 'Use region band colors'}
          onClick={() => patch({ regionColors: !prefs.regionColors })}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="5" cy="6" r="3" fill="currentColor" opacity="0.85" />
            <circle cx="11" cy="6" r="3" fill="currentColor" opacity="0.55" />
            <circle cx="8" cy="11" r="3" fill="currentColor" opacity="0.7" />
          </svg>
        </Icon>
        <Icon
          pressed={prefs.showBars}
          label={prefs.showBars ? 'Hide FFT bars' : 'Show FFT bars'}
          onClick={() => patch({ showBars: !prefs.showBars })}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="8" width="3" height="6" rx="0.6" fill="currentColor" />
            <rect x="6.5" y="3" width="3" height="11" rx="0.6" fill="currentColor" />
            <rect x="11" y="6" width="3" height="8" rx="0.6" fill="currentColor" />
          </svg>
        </Icon>
        <Icon
          pressed={prefs.showLine}
          label={prefs.showLine ? 'Hide spectrum line' : 'Show spectrum line'}
          onClick={() => patch({ showLine: !prefs.showLine })}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M1.5 11.5 L4.5 6.5 L7.2 9.2 L10.5 3.5 L14.5 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Icon>
        <Icon
          pressed={prefs.legendOpen}
          label={prefs.legendOpen ? 'Hide spectrum legend' : 'Show spectrum legend'}
          onClick={() => patch({ legendOpen: !prefs.legendOpen })}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2" width="3" height="3" rx="1" fill="currentColor" />
            <rect x="6.5" y="2.5" width="8" height="2" rx="1" fill="currentColor" />
            <rect x="1.5" y="6.5" width="3" height="3" rx="1" fill="currentColor" />
            <rect x="6.5" y="7" width="8" height="2" rx="1" fill="currentColor" />
            <rect x="1.5" y="11" width="3" height="3" rx="1" fill="currentColor" />
            <rect x="6.5" y="11.5" width="8" height="2" rx="1" fill="currentColor" />
          </svg>
        </Icon>
      </div>}
      <FftViewToggle variant="focus" mode={prefs.viewMode} onChange={(viewMode) => patch({ viewMode })} />
      </div>
    </div>
  )
}

function Select({
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
    <label className={styles.fftField}>
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function Icon({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={styles.hit} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}
