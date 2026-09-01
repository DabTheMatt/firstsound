import type { ReactNode } from 'react'
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
  normalizeView: boolean
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
  normalizeView,
}: Props) {
  const tools = TOOLS

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
      <div className={styles.views}>
        <IconButton label="Fit sample" onClick={() => onView('fit-sample')}>
          <FitIcon />
        </IconButton>
        <IconButton label="Fit selection" onClick={() => onView('fit-selection')}>
          <FitSelIcon />
        </IconButton>
        <IconButton label="Zoom to selection" onClick={() => onView('zoom-selection')}>
          <ZoomSelIcon />
        </IconButton>
        <IconButton
          label="Normalize view"
          pressed={normalizeView}
          onClick={() => onView('normalize-view')}
        >
          <NormIcon />
        </IconButton>
        <IconButton label="Reset zoom" onClick={() => onView('reset-zoom')}>
          <ResetIcon />
        </IconButton>
        <IconButton label="Waveform" pressed={viz === 'waveform'} onClick={() => onViz('waveform')}>
          <WaveIcon />
        </IconButton>
        <IconButton label="Spectrum" pressed={viz === 'spectrum'} onClick={() => onViz('spectrum')}>
          <SpecIcon />
        </IconButton>
        <IconButton label="Split view" pressed={viz === 'split'} onClick={() => onViz('split')}>
          <SplitIcon />
        </IconButton>
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

function IconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${pressed ? styles.active : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function FitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 7V3h4M15 7V3h-4M3 11v4h4M15 11v4h-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function FitSelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4" y="5" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 9h2M14 9h2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ZoomSelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12l4 4M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function NormIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 14V4M9 14V7M14 14V9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 9a5 5 0 1 0 1.5-3.5M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M1 9c2-6 3 6 5 0s3 6 5 0 3 6 6 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function SpecIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 14V8M7 14V4M11 14V6M15 14V9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function SplitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 10h14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
