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
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { analyzerCopy } from '../../i18n/analyzerCopy'
import { SpectrumDisplaySettings } from './SpectrumDisplaySettings'
import styles from './Workspace.module.css'

const VIEW_IDS: SpectralCameraPreset[] = ['front', 'angled', 'top']

/**
 * Analyzer options in the same compact rows as the workspace bar.
 * Layer and 2D / 3D stay on the FFT bar unless `showView` puts them in this menu.
 */
export function AnalyzerSettingsMenu({ showView = false }: { showView?: boolean }) {
  const { t, locale } = useI18n()
  const copy = analyzerCopy(locale)
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
    <div className={styles.analyzerMenu}>
      {showView ? (
        <>
          <h2 className={styles.analyzerSection}>{copy.graph}</h2>
          <div className={styles.analyzerRows}>
            <ChoiceField
              label={copy.layer}
              value={prefs.layer}
              options={[
                { id: 'pre', label: copy.before },
                { id: 'post', label: copy.after },
                { id: 'both', label: copy.both },
              ]}
              onChange={(id) => patch({ layer: id, historyLayer: id })}
            />
            <ChoiceField
              label={copy.mode}
              value={prefs.viewMode}
              options={[
                { id: '2d', label: '2D' },
                { id: '3d', label: '3D', title: copy.history3d },
              ]}
              onChange={(id) => patch({ viewMode: id })}
            />
          </div>
        </>
      ) : null}
      <h2 className={styles.analyzerSection}>{copy.history}</h2>
      <div className={styles.analyzerRows}>
        <ChoiceField
          label={copy.time}
          value={String(prefs.historySec)}
          options={SPECTRAL_HISTORY_SECONDS.map((sec) => ({ id: String(sec), label: `${sec}s` }))}
          onChange={(id) => patch({ historySec: clampSpectralHistorySeconds(Number(id)) })}
        />
        <ChoiceField
          label={copy.view}
          value={prefs.cameraPreset}
          options={VIEW_IDS.map((id) => ({
            id,
            label: id === 'front' ? copy.front : id === 'angled' ? copy.angled : copy.top,
          }))}
          onChange={(id) => patch({ cameraPreset: id })}
        />
        <ChoiceField
          label={copy.freeze}
          value={frozen ? 'on' : 'off'}
          options={[
            { id: 'off', label: copy.off },
            { id: 'on', label: copy.on, title: copy.freezeHint },
          ]}
          onChange={(id) => setSpectralHistoryFrozen(id === 'on')}
        />
      </div>

      <h2 className={styles.analyzerSection}>{copy.picture}</h2>
      <div className={styles.analyzerRows}>
        <ChoiceField
          label={copy.density}
          value={prefs.density}
          options={SPECTRAL_DENSITIES.map((density) => ({
            id: density,
            label:
              density === 'auto' ? copy.auto : density === 'low' ? copy.low : density === 'high' ? copy.high : copy.normal,
          }))}
          onChange={(id) => patch({ density: id as SpectralDensity })}
        />
        <ChoiceField
          label={copy.draw}
          value={prefs.drawStyle}
          options={[
            { id: 'lines' as const, label: copy.lines },
            { id: 'surface' as const, label: copy.surface },
          ]}
          onChange={(id) => patch({ drawStyle: id as SpectralDrawStyle })}
        />
        <ChoiceField
          label={copy.color}
          value={prefs.colorMode}
          options={SPECTRAL_COLOR_MODES.map((mode) => ({
            id: mode,
            label: mode === 'off' ? copy.off : mode === 'level' ? copy.level : copy.frequency,
          }))}
          onChange={(id) => patch({ colorMode: id })}
        />
        <ChoiceField
          label={copy.trails}
          value={prefs.peakTrails ? 'on' : 'off'}
          options={[
            { id: 'off', label: copy.off },
            { id: 'on', label: copy.on },
          ]}
          onChange={(id) => patch({ peakTrails: id === 'on' })}
        />
        <div className={styles.analyzerActions}>
          <button
            type="button"
            className={styles.analyzerChoice}
            onClick={() => {
              patch({ cameraPreset: 'angled' })
              requestSpectralViewReset()
            }}
          >
            {copy.resetView}
          </button>
          <button type="button" className={styles.analyzerChoice} onClick={() => requestSpectralHistoryClear()}>
            {copy.clearHistory}
          </button>
        </div>
      </div>

      <h2 className={styles.analyzerSection}>{copy.analyzer}</h2>
      <div className={styles.analyzerRows}>
        {spectralBandsEnabled && listenBand ? (
          <p className={styles.analyzerNote}>{t.waveform.spectral.analyseBand}</p>
        ) : null}
        <SelectField
          label={copy.range}
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
          label={copy.columns}
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
          label={copy.fall}
          value={prefs.fall}
          options={SPECTRUM_FALL_MODES.map((mode) => ({
            id: mode,
            label: mode === 'slow' ? copy.slow : mode === 'fast' ? copy.fast : copy.normal,
          }))}
          onChange={(id) => patch({ fall: clampSpectrumFallMode(id) })}
        />
        <ChoiceField
          label={copy.follow}
          value={prefs.follow}
          options={SPECTRUM_FOLLOW_MODES.map((mode) => ({
            id: mode,
            label: mode === 'peak' ? copy.peak : mode === 'slow' ? copy.slow : copy.both,
          }))}
          onChange={(id) => patch({ follow: clampSpectrumFollowMode(id) })}
        />
        <ChoiceField
          label={copy.eqChannel}
          value={snap.eqChannelMode}
          options={EQ_CHANNEL_MODES.map((opt) => ({
            id: opt.value,
            label: opt.value === 'shared' ? copy.shared : opt.value === 'left' ? copy.left : copy.right,
            title: opt.value === 'shared' ? copy.sharedHint : opt.value === 'left' ? copy.leftHint : copy.rightHint,
          }))}
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

      <h2 className={styles.analyzerSection}>{copy.display}</h2>
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
    <div className={styles.analyzerRow} role="group" aria-label={label}>
      <span className={styles.analyzerLabel}>{label}</span>
      <div className={styles.analyzerControl}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={value === opt.id ? styles.analyzerOn : styles.analyzerChoice}
            aria-pressed={value === opt.id}
            title={opt.title}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
    <label className={styles.analyzerRow}>
      <span className={styles.analyzerLabel}>{label}</span>
      <select className={styles.analyzerSelect} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}
