import { useEffect, useId, useRef, useState } from 'react'
import {
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { useI18n } from '../../i18n'
import { FftViewToggle } from '../waveform/SpectralHistoryControls'
import { AnalyzerSettingsMenu } from './AnalyzerSettingsMenu'
import styles from './Workspace.module.css'

const LAYERS: { id: SpectrumLayer; label: string }[] = [
  { id: 'pre', label: 'Before' },
  { id: 'post', label: 'After' },
  { id: 'both', label: 'Both' },
]

/** Primary FFT controls. Analyzer configuration stays one action away. */
export function FftPrimaryBar() {
  const { t } = useI18n()
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const patch = (next: Partial<SpectrumPrefs>) => {
    patchSpectrumPrefs(next)
  }

  return (
    <div className={styles.cornerMenu} ref={rootRef} data-fft-primary="">
      <button
        type="button"
        className={styles.textButton}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t.workspace.moreEdit}
        onClick={() => setOpen((value) => !value)}
      >
        •••
      </button>
      {open ? (
        <div className={styles.menu} id={menuId} role="menu" aria-label={t.workspace.analyzerSettings}>
          <div className={styles.segment} role="group" aria-label={t.workspace.analyzerLayer}>
            {LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={prefs.layer === layer.id ? styles.segmentOn : styles.segmentOff}
                aria-pressed={prefs.layer === layer.id}
                onClick={() => patch({ layer: layer.id, historyLayer: layer.id })}
              >
                {layer.label}
              </button>
            ))}
          </div>
          <FftViewToggle mode={prefs.viewMode} onChange={(viewMode) => patch({ viewMode })} />
          <AnalyzerSettingsMenu />
        </div>
      ) : null}
    </div>
  )
}
