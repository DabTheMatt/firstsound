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
  type SpectralDensity,
  type SpectralDrawStyle,
} from '../../audio/engine/spectralHistory'
import {
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { useI18n } from '../../i18n'
import { analyzerCopy } from '../../i18n/analyzerCopy'
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
  const { locale } = useI18n()
  const pill = variant === 'focus' ? focusStyles.fftField : spectrumStyles.bands
  const choice = variant === 'focus' ? focusStyles.fftChoice : spectrumStyles.choice
  return (
    <div className={pill} role="group" aria-label={analyzerCopy(locale).fftView}>
      <button type="button" className={choice} aria-pressed={mode === '2d'} onClick={() => onChange('2d')}>
        2D
      </button>
      <button
        type="button"
        className={choice}
        aria-pressed={mode === '3d'}
        aria-label="3D"
        title={analyzerCopy(locale).history3d}
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

/** Primary 3D controls. The 2D/3D switch stays in the FFT chrome, not in this bar. */
export function SpectralHistoryControls({
  variant = 'bar',
  embedSettings = false,
}: {
  variant?: 'bar' | 'focus'
  /** Draw the extra 3D options in this bar. Used when a parent menu would clip a popup. */
  embedSettings?: boolean
}) {
  const { locale } = useI18n()
  const copy = analyzerCopy(locale)
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
    patchSpectrumPrefs(next)
  }

  const settings = (includeShared: boolean) => (
    <>
      {includeShared ? (
        <>
          <div className={styles.row}>
            <span>FFT</span>
            <select
              aria-label={copy.fftSize}
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
            <span>{copy.smooth}</span>
            <select
              aria-label={copy.smoothing}
              value={prefs.fall}
              onChange={(event) => patch({ fall: clampSpectrumFallMode(event.target.value) })}
            >
              {SPECTRUM_FALL_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'slow' ? copy.slow : mode === 'fast' ? copy.fast : copy.normal}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <span>{copy.range}</span>
            <select
              aria-label={copy.range}
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
            <span>{copy.scale}</span>
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
        <span>{copy.density}</span>
        {SPECTRAL_DENSITIES.map((density) => (
          <button
            key={density}
            type="button"
            aria-pressed={prefs.density === density}
            onClick={() => patch({ density: density as SpectralDensity })}
          >
            {density === 'auto' ? copy.auto : density === 'low' ? copy.low : density === 'high' ? copy.high : copy.normal}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span>{copy.draw}</span>
        {(['lines', 'surface'] as const).map((style) => (
          <button
            key={style}
            type="button"
            aria-pressed={prefs.drawStyle === style}
            onClick={() => patch({ drawStyle: style as SpectralDrawStyle })}
          >
            {style === 'lines' ? copy.lines : copy.surface}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span>{copy.color}</span>
        {SPECTRAL_COLOR_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={prefs.colorMode === mode}
            onClick={() => patch({ colorMode: mode })}
          >
            {mode === 'off' ? copy.off : mode === 'level' ? copy.level : copy.frequency}
          </button>
        ))}
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={prefs.peakTrails}
          onChange={(event) => patch({ peakTrails: event.target.checked })}
        />
        {copy.peakTrails}
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            patch({ cameraPreset: 'angled' })
            requestSpectralViewReset()
          }}
        >
          {copy.resetView}
        </button>
        <button type="button" onClick={() => requestSpectralHistoryClear()}>
          {copy.clearHistory}
        </button>
      </div>
    </>
  )

  return (
    <div
      className={`${variant === 'focus' ? styles.focus : styles.bar} ${embedSettings ? styles.embed : ''}`}
      data-spectral-history=""
    >
      <div className={pill} role="group" aria-label={copy.history}>
        <span>{copy.history}</span>
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
      <div className={pill} role="group" aria-label={copy.signal}>
        <span>{copy.signal}</span>
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={choice}
            aria-pressed={prefs.historyLayer === layer.id}
            title={
              layer.id === 'pre'
                ? copy.beforeChain
                : layer.id === 'post'
                  ? copy.afterChain
                  : copy.sourceAndOutput
            }
            onClick={() => patch({ historyLayer: layer.id })}
          >
            {layer.id === 'pre' ? copy.source : layer.id === 'post' ? copy.output : copy.both}
          </button>
        ))}
      </div>
      )}
      <div className={pill} role="group" aria-label={copy.view}>
        <span>{copy.view}</span>
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={choice}
            aria-pressed={prefs.cameraPreset === view.id}
            onClick={() => patch({ cameraPreset: view.id })}
          >
            {view.id === 'front' ? copy.front : view.id === 'angled' ? copy.angled : copy.top}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={pill}
        aria-pressed={frozen}
        title={copy.freezeHint}
        onClick={() => setSpectralHistoryFrozen(!frozen)}
      >
        {copy.freeze}
      </button>
      {embedSettings ? (
        <div className={styles.inline} id={panelId} aria-label={copy.settings3d}>
          {settings(false)}
        </div>
      ) : (
      <div className={styles.moreWrap} ref={wrapRef}>
        <button
          type="button"
          className={icon}
          aria-expanded={open}
          aria-controls={panelId}
          title={copy.settings3d}
          onClick={() => setOpen((value) => !value)}
        >
          •••
        </button>
        {open ? (
          sheet ? (
            createPortal(
              <div className={styles.sheet} ref={panelRef} id={panelId} role="dialog" aria-label={copy.settings3d}>
                {settings(true)}
              </div>,
              document.body,
            )
          ) : (
            <div className={styles.panel} ref={panelRef} id={panelId} role="dialog" aria-label={copy.settings3d}>
              {settings(true)}
            </div>
          )
        ) : null}
      </div>
      )}
    </div>
  )
}
