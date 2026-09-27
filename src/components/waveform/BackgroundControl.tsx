import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import {
  VIZ_BG_GRAIN_MAX,
  VIZ_BG_OPACITY_MAX,
  clearVizBackgroundImage,
  getVizBackground,
  loadVizBackgroundFile,
  setVizBackgroundGrain,
  setVizBackgroundOpacity,
  subscribeVizBackground,
} from './vizBackground'
import barStyles from './WaveformToolbar.module.css'
import styles from './BackgroundControl.module.css'

function percent(value: number, max: number): number {
  if (!(max > 0)) return 0
  return Math.round((Math.min(max, Math.max(0, value)) / max) * 100)
}

export function BackgroundControl() {
  const { t } = useI18n()
  const state = useSyncExternalStore(subscribeVizBackground, getVizBackground, getVizBackground)
  const [open, setOpen] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ignoreOutside = useRef(false)
  const copy = t.waveform

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(220, window.innerWidth - 16)
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      setMenuPos({ top: rect.bottom + 6, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (ignoreOutside.current) {
        ignoreOutside.current = false
        return
      }
      const node = event.target as Node | null
      if (node && (triggerRef.current?.contains(node) || panelRef.current?.contains(node))) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const opacityPct = percent(state.opacity, VIZ_BG_OPACITY_MAX)
  const grainPct = percent(state.grain, VIZ_BG_GRAIN_MAX)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${barStyles.iconBtn} ${state.imageUrl ? barStyles.active : ''}`}
        aria-label={copy.background}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={copy.background}
        onClick={() => setOpen((value) => !value)}
      >
        <ImageIcon />
        <span className={barStyles.caption}>{copy.backgroundCaption}</span>
      </button>
      {open && menuPos
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.panel}
              role="dialog"
              aria-label={copy.background}
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <p className={styles.heading}>{copy.background}</p>
              {state.fileName ? <p className={styles.file}>{state.fileName}</p> : null}
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  ignoreOutside.current = true
                  setRejected(false)
                  fileRef.current?.click()
                }}
              >
                {copy.backgroundLoad}
              </button>
              <input
                ref={fileRef}
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void loadVizBackgroundFile(file).then((ok) => setRejected(!ok))
                }}
              />
              <label className={styles.row}>
                <span className={styles.label}>{copy.backgroundOpacity}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={opacityPct}
                  disabled={!state.imageUrl}
                  aria-label={copy.backgroundOpacity}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={opacityPct}
                  aria-valuetext={`${opacityPct}%`}
                  onChange={(event) => setVizBackgroundOpacity((Number(event.target.value) / 100) * VIZ_BG_OPACITY_MAX)}
                />
                <span className={styles.value}>{opacityPct}</span>
              </label>
              <label className={styles.row}>
                <span className={styles.label}>{copy.backgroundGrain}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={grainPct}
                  disabled={!state.imageUrl}
                  aria-label={copy.backgroundGrain}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={grainPct}
                  aria-valuetext={`${grainPct}%`}
                  onChange={(event) => setVizBackgroundGrain((Number(event.target.value) / 100) * VIZ_BG_GRAIN_MAX)}
                />
                <span className={styles.value}>{grainPct}</span>
              </label>
              <button
                type="button"
                className={styles.action}
                disabled={!state.imageUrl}
                onClick={() => {
                  clearVizBackgroundImage()
                  setRejected(false)
                }}
              >
                {copy.backgroundRemove}
              </button>
              <p className={styles.note}>{rejected ? copy.backgroundReject : copy.backgroundSession}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="1.6" y="3" width="12.8" height="10" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.2" cy="6.3" r="1.05" fill="currentColor" />
      <path
        d="M2.4 11.3 L5.8 8.3 L8.2 10.1 L10.7 7.4 L13.6 11.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
