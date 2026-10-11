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
import { analyzerCopy } from '../../i18n/analyzerCopy'
import styles from './MobileContext.module.css'

/** Advanced analyzer options for the phone EQ workspace. Not shown on the graph. */
export function AnalyzerSettings() {
  const { t, locale } = useI18n()
  const copy = analyzerCopy(locale)
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
        {copy.layer}
        <select
          aria-label={copy.eqLayer}
          value={prefs.layer}
          onChange={(event) => patch({ layer: event.target.value as SpectrumLayer })}
        >
          <option value="pre">{copy.before}</option>
          <option value="post">{copy.after}</option>
          <option value="both">{copy.both}</option>
        </select>
      </label>
      <label className={styles.field}>
        {copy.fall}
        <select
          aria-label={copy.fallAria}
          value={prefs.fall}
          onChange={(event) => patch({ fall: clampSpectrumFallMode(event.target.value) })}
        >
          {SPECTRUM_FALL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode === 'slow' ? copy.slow : mode === 'fast' ? copy.fast : copy.normal}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {copy.range}
        <select
          aria-label={copy.range}
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
        {copy.scale}
        <select
          aria-label={copy.scale}
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
