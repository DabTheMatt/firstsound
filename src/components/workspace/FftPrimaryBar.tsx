import { useEffect, useId, useRef, useState } from 'react'
import {
  loadSpectrumPrefs,
  persistSpectrumPrefs,
  subscribeSpectrumPrefs,
  type SpectrumLayer,
  type SpectrumPrefs,
} from '../../audio/engine/spectrumPrefs'
import { useI18n } from '../../i18n'
import { FftFocusTools } from '../mobile/FftFocusTools'
import { FftViewToggle } from '../waveform/SpectralHistoryControls'
import styles from './Workspace.module.css'

function analyzerMenuStyle(anchor: HTMLButtonElement | null): { top: number; left: number } | undefined {
  if (!anchor) return undefined
  const rect = anchor.getBoundingClientRect()
  const width = 320
  return {
    top: rect.bottom + 4,
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
  }
}

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
  const anchorRef = useRef<HTMLButtonElement>(null)

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
    persistSpectrumPrefs({ ...prefs, ...next })
  }

  return (
    <div className={styles.editBar} ref={rootRef} data-fft-primary="">
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
      <button
        ref={anchorRef}
        type="button"
        className={styles.textButton}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {t.workspace.analyzerSettings}
      </button>
      {open ? (
        <div
          className={`${styles.menu} ${styles.menuFixed}`}
          id={menuId}
          role="dialog"
          aria-label={t.workspace.analyzerSettings}
          style={analyzerMenuStyle(anchorRef.current)}
        >
          <FftFocusTools />
        </div>
      ) : null}
    </div>
  )
}
