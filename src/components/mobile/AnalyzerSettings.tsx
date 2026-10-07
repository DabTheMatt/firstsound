import { useEffect, useState } from 'react'
import {
  SPECTRUM_FALL_MODES,
  SPECTRUM_RANGE_CHOICES,
  clampSpectrumFallMode,
  clampSpectrumRange,
} from '../../audio/engine/spectrumBands'
import { FREQ_SCALE_OPTIONS, loadFreqScale, persistFreqScale, subscribeFreqScale, type FreqScaleKind } from '../../audio/engine/freqScale'
import { loadSpectrumPrefs, patchSpectrumPrefs, subscribeSpectrumPrefs, type SpectrumLayer, type SpectrumPrefs } from '../../audio/engine/spectrumPrefs'
import { useI18n } from '../../i18n'
import styles from './MobileContext.module.css'

/** Advanced analyzer options for the phone EQ workspace. Not shown on the graph. */
export function AnalyzerSettings() {
  const { t } = useI18n()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [scale, setScale] = useState<FreqScaleKind>(() => loadFreqScale())

  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(() => subscribeFreqScale(setScale), [])

  const patch = (next: Partial<SpectrumPrefs>) => {
    patchSpectrumPrefs(next)
  }

  return (
    <div className={styles.analyzer} aria-label={t.mobile.analyzer}>
      <label className={styles.field}>
        Layer
        <select
          aria-label="EQ spectrum layer"
          value={prefs.layer}
          onChange={(event) => patch({ layer: event.target.value as SpectrumLayer })}
        >
          <option value="pre">Before</option>
          <option value="post">After</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label className={styles.field}>
        Fall
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
      </label>
      <label className={styles.field}>
        Range
        <select
          aria-label="Analyzer range"
          value={prefs.range}
          onChange={(event) => patch({ range: clampSpectrumRange(Number(event.target.value)) })}
        >
          {SPECTRUM_RANGE_CHOICES.map((db) => (
            <option key={db} value={db}>
              {db} dB
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Scale
        <select
          aria-label="Frequency scale"
          value={scale}
          onChange={(event) => persistFreqScale(event.target.value as FreqScaleKind)}
        >
          {FREQ_SCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
