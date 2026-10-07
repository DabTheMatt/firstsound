import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import { AnalyzerSettingsMenu } from '../workspace/AnalyzerSettingsMenu'
import styles from './FocusChrome.module.css'

const MENU_WIDTH = 360

function menuStyle(anchor: HTMLButtonElement | null): { top: number; left: number; width: number } | undefined {
  if (!anchor) return undefined
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(MENU_WIDTH, window.innerWidth - 16)
  return {
    top: rect.bottom + 4,
    left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    width,
  }
}

/** One control on the FFT focus bar. The spectrum stays the picture; settings open over it. */
export function FftFocusTools() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.anchor} ref={rootRef} data-fft-focus="">
      <button
        ref={anchorRef}
        type="button"
        className={styles.hit}
        aria-label={t.workspace.analyzerSettings}
        title={t.workspace.analyzerSettings}
        aria-expanded={open}
        aria-controls={menuId}
        aria-pressed={open}
        onClick={() => {
          if (open) {
            setOpen(false)
            return
          }
          setBox(menuStyle(anchorRef.current) ?? null)
          setOpen(true)
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4.2h12M2 8h12M2 11.8h12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="5.2" cy="4.2" r="1.5" fill="currentColor" />
          <circle cx="10.8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="7" cy="11.8" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.fftMenu}
              id={menuId}
              role="dialog"
              data-focus-popover=""
              aria-label={t.workspace.analyzerSettings}
              style={box ?? undefined}
            >
              <AnalyzerSettingsMenu showView />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
