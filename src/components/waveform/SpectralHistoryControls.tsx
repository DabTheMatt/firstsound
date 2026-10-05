import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SPECTRUM_RESOLUTION_CHOICES, clampSpectrumResolution } from '../../audio/engine/analyserBudget'
import { FREQ_SCALE_OPTIONS, loadFreqScale, persistFreqScale, subscribeFreqScale, type FreqScaleKind } from '../../audio/engine/freqScale'
import {
  SPECTRUM_FALL_MODES,
  SPECTRUM_RANGE_CHOICES,
  clampSpectrumFallMode,
  clampSpectrumRange,
} from '../../audio/engine/spectrumBands'
import {
  SPECTRAL_COLOR_MODES,
  SPECTRAL_DENSITIES,
  SPECTRAL_HISTORY_SECONDS,
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
import focusStyles from '../mobile/FocusChrome.module.css'
import spectrumStyles from './Spectrum.module.css'
import styles from './SpectralHistory.module.css'

export function FftViewToggle({
  mode,
  onChange,
  variant = 'bar',
}: {
  mode: '2d' | '3d'
  onChange: (mode: '2d' | '3d') => void
  variant?: 'bar' | 'focus'
}) {
  const pill = variant === 'focus' ? focusStyles.fftField : spectrumStyles.bands
  const choice = variant === 'focus' ? focusStyles.fftChoice : spectrumStyles.choice
  return (
    <div className={pill} role="group" aria-label="FFT view">
      <button type="button" className={choice} aria-pressed={mode === '2d'} onClick={() => onChange('2d')}>
        2D
      </button>
      <button
        type="button"
        className={choice}
        aria-pressed={mode === '3d'}
        aria-label="3D"
        title="3D Spectral History"
        onClick={() => onChange('3d')}
      >
        3D
      </button>
    </div>
  )
}

const VIEWS: { id: SpectralCameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'angled', label: 'Angled' },
  { id: 'top', label: 'Top' },
]

const LAYERS: { id: SpectrumLayer; label: string }[] = [
  { id: 'pre', label: 'Source' },
  { id: 'post', label: 'Output' },
  { id: 'both', label: 'Both' },
]

const COLOR_LABEL: Record<SpectralColorMode, string> = {
  off: 'Off',
  level: 'Level',
  frequency: 'Frequency',
}

/** Primary 3D controls. The 2D/3D switch stays in the FFT chrome, not in this bar. */
export function SpectralHistoryControls({
  variant = 'bar',
  embedSettings = false,
}: {
  variant?: 'bar' | 'focus'
  /** Draw the extra 3D options in this bar. Used when a parent menu would clip a popup. */
  embedSettings?: boolean
}) {
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [frozen, setFrozen] = useState(() => spectralHistorySession().frozen)
  const [scale, setScale] = useState<FreqScaleKind>(() => loadFreqScale())
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px), (max-height: 560px)').matches,
  )
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pill = variant === 'focus' ? focusStyles.fftField : spectrumStyles.bands
  const choice = variant === 'focus' ? focusStyles.fftChoice : spectrumStyles.choice
  const icon = variant === 'focus' ? focusStyles.hit : spectrumStyles.iconTap

  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(() => subscribeFreqScale(setScale), [])
  useEffect(
    () =>
      subscribeSpectralHistorySession(() => {
        setFrozen(spectralHistorySession().frozen)
      }),
    [],
  )
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px), (max-height: 560px)')
    const apply = () => setSheet(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [open])

  const patch = (next: Partial<SpectrumPrefs>) => {
    persistSpectrumPrefs({ ...prefs, ...next })
  }

  const settings = (includeShared: boolean) => (
    <>
      {includeShared ? (
        <>
          <div className={styles.row}>
            <span>FFT</span>
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
          </div>
          <div className={styles.row}>
            <span>Smooth</span>
            <select
              aria-label="Smoothing"
              value={prefs.fall}
              onChange={(event) => patch({ fall: clampSpectrumFallMode(event.target.value) })}
            >
              {SPECTRUM_FALL_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'slow' ? 'Slow' : mode === 'fast' ? 'Fast' : 'Normal'}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <span>Range</span>
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
          </div>
          <div className={styles.row}>
            <span>Scale</span>
            {FREQ_SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={scale === opt.value}
                title={opt.title}
                onClick={() => persistFreqScale(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div className={styles.row}>
        <span>Density</span>
        {SPECTRAL_DENSITIES.map((density) => (
          <button
            key={density}
            type="button"
            aria-pressed={prefs.density === density}
            onClick={() => patch({ density: density as SpectralDensity })}
          >
            {density === 'auto' ? 'Auto' : density === 'low' ? 'Low' : density === 'high' ? 'High' : 'Normal'}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span>Draw</span>
        {(['lines', 'surface'] as const).map((style) => (
          <button
            key={style}
            type="button"
            aria-pressed={prefs.drawStyle === style}
            onClick={() => patch({ drawStyle: style as SpectralDrawStyle })}
          >
            {style === 'lines' ? 'Lines' : 'Surface'}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span>Color</span>
        {SPECTRAL_COLOR_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={prefs.colorMode === mode}
            onClick={() => patch({ colorMode: mode })}
          >
            {COLOR_LABEL[mode]}
          </button>
        ))}
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={prefs.peakTrails}
          onChange={(event) => patch({ peakTrails: event.target.checked })}
        />
        Peak trails
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            patch({ cameraPreset: 'angled' })
            requestSpectralViewReset()
          }}
        >
          Reset view
        </button>
        <button type="button" onClick={() => requestSpectralHistoryClear()}>
          Clear history
        </button>
      </div>
    </>
  )

  return (
    <div
      className={`${variant === 'focus' ? styles.focus : styles.bar} ${embedSettings ? styles.embed : ''}`}
      data-spectral-history=""
    >
      <div className={pill} role="group" aria-label="History">
        <span>History</span>
        {SPECTRAL_HISTORY_SECONDS.map((sec) => (
          <button
            key={sec}
            type="button"
            className={choice}
            aria-pressed={prefs.historySec === sec}
            onClick={() => patch({ historySec: sec })}
          >
            {sec}s
          </button>
        ))}
      </div>
      {embedSettings ? null : (
      <div className={pill} role="group" aria-label="Signal">
        <span>Signal</span>
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={choice}
            aria-pressed={prefs.historyLayer === layer.id}
            title={layer.id === 'pre' ? 'Before the effect chain' : layer.id === 'post' ? 'After the effect chain' : 'Source and output'}
            onClick={() => patch({ historyLayer: layer.id })}
          >
            {layer.label}
          </button>
        ))}
      </div>
      )}
      <div className={pill} role="group" aria-label="View">
        <span>View</span>
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={choice}
            aria-pressed={prefs.cameraPreset === view.id}
            onClick={() => patch({ cameraPreset: view.id })}
          >
            {view.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={pill}
        aria-pressed={frozen}
        title="Freeze history. Audio keeps playing."
        onClick={() => setSpectralHistoryFrozen(!frozen)}
      >
        Freeze
      </button>
      {embedSettings ? (
        <div className={styles.inline} id={panelId} aria-label="3D Spectral History settings">
          {settings(false)}
        </div>
      ) : (
      <div className={styles.moreWrap} ref={wrapRef}>
        <button
          type="button"
          className={icon}
          aria-expanded={open}
          aria-controls={panelId}
          title="3D settings"
          onClick={() => setOpen((value) => !value)}
        >
          •••
        </button>
        {open ? (
          sheet ? (
            createPortal(
              <div className={styles.sheet} ref={panelRef} id={panelId} role="dialog" aria-label="3D Spectral History settings">
                {settings(true)}
              </div>,
              document.body,
            )
          ) : (
            <div className={styles.panel} ref={panelRef} id={panelId} role="dialog" aria-label="3D Spectral History settings">
              {settings(true)}
            </div>
          )
        ) : null}
      </div>
      )}
    </div>
  )
}
