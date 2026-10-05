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
import { FREQ_SCALE_OPTIONS, loadFreqScale, persistFreqScale, subscribeFreqScale, type FreqScaleKind } from '../../audio/engine/freqScale'
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
  persistSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { spectrumListenId } from '../../audio/spectral/bands'
import { spectralBandsEnabled } from '../../audio/spectral/ui'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './Workspace.module.css'

const VIEWS: { id: SpectralCameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'angled', label: 'Angled' },
  { id: 'top', label: 'Top' },
]

const LAYERS: { id: SpectrumLayer; label: string }[] = [
  { id: 'pre', label: 'Before' },
  { id: 'post', label: 'After' },
  { id: 'both', label: 'Both' },
]

const COLOR_LABEL: Record<SpectralColorMode, string> = {
  off: 'Off',
  level: 'Level',
  frequency: 'Frequency',
}

/** Every analyzer option, in the same rows as the workspace bar. */
export function AnalyzerSettingsMenu() {
  const { t } = useI18n()
  const snap = useEngine()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [scale, setScale] = useState<FreqScaleKind>(() => loadFreqScale())
  const [overlay, setOverlay] = useState<string>(() => loadEqOverlayFocus())
  const [frozen, setFrozen] = useState(() => spectralHistorySession().frozen)
  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(() => subscribeFreqScale(setScale), [])
  useEffect(() => subscribeEqOverlayFocus(setOverlay), [])
  useEffect(
    () =>
      subscribeSpectralHistorySession(() => {
        setFrozen(spectralHistorySession().frozen)
      }),
    [],
  )

  const patch = (next: Partial<SpectrumPrefs>) => {
    persistSpectrumPrefs({ ...prefs, ...next })
  }
  const eqs = snap.chain.filter((mod) => mod.type === 'eq')
  const overlayValue = clampEqOverlayFocus(overlay, snap.chain)
  const listenBand = spectrumListenId(snap.spectral.enabled, snap.spectral.analyser)

  return (
    <div className={styles.analyzerMenu}>
      <p className={styles.analyzerSection}>History</p>
      <Row label="Time">
        <Choices
          value={String(prefs.historySec)}
          options={SPECTRAL_HISTORY_SECONDS.map((sec) => ({ id: String(sec), label: `${sec}s` }))}
          onChange={(id) => patch({ historySec: clampSpectralHistorySeconds(Number(id)) })}
        />
      </Row>
      <Row label="View">
        <Choices
          value={prefs.cameraPreset}
          options={VIEWS}
          onChange={(id) => patch({ cameraPreset: id })}
        />
      </Row>
      <Row label="Freeze">
        <button
          type="button"
          className={frozen ? styles.segmentOn : styles.segmentOff}
          aria-pressed={frozen}
          title="Freeze history. Audio keeps playing."
          onClick={() => setSpectralHistoryFrozen(!frozen)}
        >
          {frozen ? 'On' : 'Off'}
        </button>
      </Row>

      <p className={styles.analyzerSection}>Picture</p>
      <Row label="Density">
        <Choices
          value={prefs.density}
          options={SPECTRAL_DENSITIES.map((density) => ({
            id: density,
            label: density === 'auto' ? 'Auto' : density === 'low' ? 'Low' : density === 'high' ? 'High' : 'Normal',
          }))}
          onChange={(id) => patch({ density: id as SpectralDensity })}
        />
      </Row>
      <Row label="Draw">
        <Choices
          value={prefs.drawStyle}
          options={[
            { id: 'lines' as const, label: 'Lines' },
            { id: 'surface' as const, label: 'Surface' },
          ]}
          onChange={(id) => patch({ drawStyle: id as SpectralDrawStyle })}
        />
      </Row>
      <Row label="Color">
        <Choices
          value={prefs.colorMode}
          options={SPECTRAL_COLOR_MODES.map((mode) => ({ id: mode, label: COLOR_LABEL[mode] }))}
          onChange={(id) => patch({ colorMode: id })}
        />
      </Row>
      <Row label="Trails">
        <label className={styles.analyzerCheck}>
          <input
            type="checkbox"
            checked={prefs.peakTrails}
            onChange={(event) => patch({ peakTrails: event.target.checked })}
          />
          Peak trails
        </label>
      </Row>
      <div className={styles.analyzerActions}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            patch({ cameraPreset: 'angled' })
            requestSpectralViewReset()
          }}
        >
          Reset view
        </button>
        <button type="button" className={styles.textButton} onClick={() => requestSpectralHistoryClear()}>
          Clear history
        </button>
      </div>

      <p className={styles.analyzerSection}>Analyzer</p>
      {spectralBandsEnabled && listenBand ? (
        <p className={styles.analyzerNote}>
          {t.waveform.spectral.analyseBand}
        </p>
      ) : null}
      <Row label="Layer">
        <Choices
          value={prefs.layer}
          options={LAYERS}
          onChange={(id) => patch({ layer: id, historyLayer: id })}
        />
      </Row>
      <Row label="Range">
        <select
          aria-label="Analyzer range"
          value={String(prefs.range)}
          onChange={(event) => patch({ range: clampSpectrumRange(Number(event.target.value)) })}
        >
          {SPECTRUM_RANGE_CHOICES.map((db) => (
            <option key={db} value={db}>
              {db} dB
            </option>
          ))}
        </select>
      </Row>
      <Row label="Scale">
        <Choices
          value={scale}
          options={FREQ_SCALE_OPTIONS.map((opt) => ({ id: opt.value, label: opt.label, title: opt.title }))}
          onChange={(id) => persistFreqScale(id)}
        />
      </Row>
      <Row label="Columns">
        <select
          aria-label="Spectrum display columns"
          value={String(prefs.bands)}
          onChange={(event) => patch({ bands: clampSpectrumBandCount(Number(event.target.value)) })}
        >
          {SPECTRUM_BAND_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Row>
      <Row label="FFT">
        <select
          aria-label="FFT size"
          value={String(prefs.resolution)}
          onChange={(event) => patch({ resolution: clampSpectrumResolution(Number(event.target.value)) })}
        >
          {SPECTRUM_RESOLUTION_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Fall">
        <select
          aria-label="Spectrum fall speed"
          value={prefs.fall}
          onChange={(event) => patch({ fall: clampSpectrumFallMode(event.target.value) })}
        >
          {SPECTRUM_FALL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode === 'slow' ? 'Slow' : mode === 'fast' ? 'Fast' : 'Normal'}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Follow">
        <select
          aria-label="Spectrum envelope follow"
          value={prefs.follow}
          onChange={(event) => patch({ follow: clampSpectrumFollowMode(event.target.value) })}
        >
          {SPECTRUM_FOLLOW_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode === 'peak' ? 'Peak' : mode === 'slow' ? 'Slow' : 'Both'}
            </option>
          ))}
        </select>
      </Row>
      <Row label="EQ ch">
        <select
          aria-label="EQ channel"
          value={snap.eqChannelMode}
          onChange={(event) => engine.setEqChannelMode(event.target.value as EqChannelMode)}
        >
          {EQ_CHANNEL_MODES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.title}>
              {opt.label}
            </option>
          ))}
        </select>
      </Row>
      {eqs.length > 1 ? (
        <Row label="EQ">
          <select
            aria-label="EQ overlay"
            value={overlayValue}
            onChange={(event) => {
              const next = clampEqOverlayFocus(event.target.value, snap.chain)
              setOverlay(next)
              persistEqOverlayFocus(next)
            }}
          >
            {eqOverlayOptions(snap.chain).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Row>
      ) : null}

      <p className={styles.analyzerSection}>Display</p>
      <div className={styles.analyzerIcons}>
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
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.analyzerRow}>
      <span className={styles.analyzerLabel}>{label}</span>
      <div className={styles.analyzerControl}>{children}</div>
    </div>
  )
}

function Choices<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string; title?: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className={styles.segment} role="group">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={value === opt.id ? styles.segmentOn : styles.segmentOff}
          aria-pressed={value === opt.id}
          title={opt.title}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
    <button type="button" className={styles.analyzerIcon} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}
