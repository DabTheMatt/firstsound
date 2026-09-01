import { useEffect, useRef, useState } from 'react'
import type { VizMode, WaveTool } from '../../app/editorState'
import styles from './WaveformToolbar.module.css'

type Props = {
  tool: WaveTool
  onTool: (tool: WaveTool) => void
  viz: VizMode
  onViz: (viz: VizMode) => void
  zoomLabel: string
  onZoomIn: () => void
  onZoomOut: () => void
  onView: (action: ViewAction) => void
  compact: boolean
}

export type ViewAction =
  | 'fit-sample'
  | 'fit-selection'
  | 'zoom-selection'
  | 'normalize-view'
  | 'reset-zoom'

const TOOLS: { id: WaveTool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'pan', label: 'Pan' },
  { id: 'fade', label: 'Fade' },
  { id: 'zero', label: 'Zero' },
]

export function WaveformToolbar({
  tool,
  onTool,
  viz,
  onViz,
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onView,
  compact,
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  const tools = compact ? TOOLS.filter((t) => t.id !== 'pan') : TOOLS

  return (
    <div className={styles.bar}>
      <div className={styles.tools}>
        {tools.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.tool} ${tool === item.id ? styles.active : ''}`}
            aria-pressed={tool === item.id}
            onClick={() => onTool(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.menuWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.tool}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          View ▾
        </button>
        {open ? (
          <div className={styles.menu} role="menu">
            <button type="button" onClick={() => { onView('fit-sample'); setOpen(false) }}>
              Fit Sample
            </button>
            <button type="button" onClick={() => { onView('fit-selection'); setOpen(false) }}>
              Fit Selection
            </button>
            <button type="button" onClick={() => { onView('zoom-selection'); setOpen(false) }}>
              Zoom to Selection
            </button>
            <button type="button" onClick={() => { onView('normalize-view'); setOpen(false) }}>
              Normalize View
            </button>
            <button type="button" onClick={() => { onView('reset-zoom'); setOpen(false) }}>
              Reset Zoom
            </button>
            <hr />
            <button type="button" className={viz === 'waveform' ? styles.picked : ''} onClick={() => { onViz('waveform'); setOpen(false) }}>
              Waveform
            </button>
            <button type="button" className={viz === 'spectrum' ? styles.picked : ''} onClick={() => { onViz('spectrum'); setOpen(false) }}>
              Spectrum
            </button>
            <button type="button" className={viz === 'split' ? styles.picked : ''} onClick={() => { onViz('split'); setOpen(false) }}>
              Split
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.zoom}>
        <button type="button" className={styles.icon} aria-label="Zoom out" onClick={onZoomOut}>
          −
        </button>
        <span>{zoomLabel}</span>
        <button type="button" className={styles.icon} aria-label="Zoom in" onClick={onZoomIn}>
          +
        </button>
      </div>
    </div>
  )
}