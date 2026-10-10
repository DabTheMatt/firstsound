import { useEffect, useId, useRef, useState } from 'react'
import {
  loadSpectrumPrefs,
  patchSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { useI18n } from '../../i18n'
import { AnalyzerSettingsMenu } from './AnalyzerSettingsMenu'
import styles from './Workspace.module.css'

const LAYERS: { id: SpectrumLayer; label: string }[] = [
  { id: 'pre', label: 'Before' },
  { id: 'post', label: 'After' },
  { id: 'both', label: 'Both' },
]

/** Layer and 2D / 3D stay on the bar. The rest opens from ••• at the end. */
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
    <div className={styles.viewBar} ref={rootRef} data-fft-primary="">
      <div className={styles.segment} role="group" aria-label={t.workspace.analyzerLayer}>
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={prefs.layer === layer.id ? styles.segmentOn : styles.textButton}
            aria-pressed={prefs.layer === layer.id}
            onClick={() => patch({ layer: layer.id, historyLayer: layer.id })}
          >
            {layer.label}
          </button>
        ))}
      </div>
      <div className={styles.segment} role="group" aria-label="FFT view">
        <button
          type="button"
          className={prefs.viewMode === '2d' ? styles.segmentOn : styles.textButton}
          aria-pressed={prefs.viewMode === '2d'}
          onClick={() => patch({ viewMode: '2d' })}
        >
          2D
        </button>
        <button
          type="button"
          className={prefs.viewMode === '3d' ? styles.segmentOn : styles.textButton}
          aria-pressed={prefs.viewMode === '3d'}
          aria-label="3D"
          title="3D Spectral History"
          onClick={() => patch({ viewMode: '3d' })}
        >
          3D
        </button>
      </div>
      <div className={styles.viewMore} data-view-more="">
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
            <AnalyzerSettingsMenu />
          </div>
        ) : null}
      </div>
    </div>
  )
}
