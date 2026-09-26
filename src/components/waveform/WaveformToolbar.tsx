import type { ReactNode } from 'react'
import type { VizMode, WaveTool } from '../../app/editorState'
import { useI18n } from '../../i18n'
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
  onTrim?: () => void
  onAutoFade?: () => void
  autoFade?: boolean
  normalizeView: boolean
  minimal?: boolean
}

export type ViewAction =
  | 'fit-sample'
  | 'fit-selection'
  | 'zoom-selection'
  | 'normalize-view'
  | 'reset-zoom'

const TOOLS: { id: WaveTool; key: 'edit' }[] = [{ id: 'select', key: 'edit' }]

/** Unfinished waveform views. Flip to restore MULTI and TRACKS in the toolbar. */
const SHOW_UNFINISHED_VIEWS = false

export function WaveformToolbar({
  tool: _tool,
  onTool,
  viz,
  onViz,
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onView,
  onTrim,
  onAutoFade,
  autoFade: _autoFade = false,
  normalizeView,
  minimal = false,
}: Props) {
  const { t } = useI18n()
  const tools = TOOLS

  return (
    <div className={`${styles.bar} ${minimal ? styles.minimal : ''}`}>
      {!minimal ? (
        <div className={`${styles.cluster} ${styles.tools}`}>
          <span className={styles.kicker}>{t.waveform.edit}</span>
          <div className={styles.edit}>
          {tools.map((item) => (
            <IconButton
              key={item.id}
              label={t.waveform[item.key]}
              caption={t.waveform[item.key]}
              onClick={() => onTool(item.id)}
            >
              <EditIcon />
            </IconButton>
          ))}
          {onTrim ? (
            <IconButton label={t.waveform.trimTitle} caption={t.waveform.trim} onClick={onTrim}>
              <TrimIcon />
            </IconButton>
          ) : null}
          {onAutoFade ? (
            <IconButton
              label={t.waveform.autoFadeTitle}
              caption={t.waveform.autoFade}
              onClick={onAutoFade}
            >
              <AutoFadeIcon />
            </IconButton>
          ) : null}
          <IconButton label={t.waveform.fitSample} caption={t.waveform.fit} onClick={() => onView('fit-sample')}>
            <FitIcon />
          </IconButton>
          <IconButton label={t.waveform.fitSelection} caption={t.waveform.sel} onClick={() => onView('fit-selection')}>
            <FitSelIcon />
          </IconButton>
          <IconButton label={t.waveform.zoomSelection} caption={t.waveform.zoom} onClick={() => onView('zoom-selection')}>
            <ZoomSelIcon />
          </IconButton>
          <IconButton
            label={t.waveform.normalizeView}
            caption={t.waveform.norm}
            pressed={normalizeView}
            onClick={() => onView('normalize-view')}
          >
            <NormIcon />
          </IconButton>
          <IconButton label={t.waveform.resetZoom} caption={t.waveform.reset} onClick={() => onView('reset-zoom')}>
            <ResetIcon />
          </IconButton>
          </div>
        </div>
      ) : (
        <div className={`${styles.cluster} ${styles.tools}`}>
          <span className={styles.kicker}>{t.waveform.edit}</span>
          <div className={styles.edit}>
          <IconButton label={t.waveform.fitSample} caption={t.waveform.fit} onClick={() => onView('fit-sample')}>
            <FitIcon />
          </IconButton>
          <IconButton label={t.waveform.zoomSelection} caption={t.waveform.zoom} onClick={() => onView('zoom-selection')}>
            <ZoomSelIcon />
          </IconButton>
          </div>
        </div>
      )}
      <div className={`${styles.cluster} ${styles.view}`}>
        <span className={styles.kicker}>{t.waveform.viewGroup}</span>
        <div className={styles.views}>
        <IconButton
          label={t.waveform.waveTitle}
          caption={t.waveform.wave}
          pressed={viz === 'waveform'}
          onClick={() => onViz('waveform')}
        >
          <WaveIcon />
        </IconButton>
        {/* MULTI and TRACKS stay implemented below, but stay out of navigation until finished. */}
        {SHOW_UNFINISHED_VIEWS && !minimal ? (
          <IconButton
            label={t.waveform.multiTitle}
            caption={t.waveform.multi}
            pressed={viz === 'waveform-multi'}
            onClick={() => onViz('waveform-multi')}
          >
            <MultiWaveIcon />
          </IconButton>
        ) : null}
        <IconButton
          label={t.waveform.spectrum}
          caption="FFT"
          pressed={viz === 'spectrum'}
          onClick={() => onViz('spectrum')}
        >
          <SpecIcon />
        </IconButton>
        {!minimal ? (
          <IconButton
            label={t.waveform.splitTitle}
            caption={t.waveform.split}
            pressed={viz === 'split'}
            onClick={() => onViz('split')}
          >
            <SplitIcon />
          </IconButton>
        ) : null}
        {!minimal ? (
          <IconButton
            label={t.waveform.eqTitle}
            caption="EQ"
            pressed={viz === 'eq-split'}
            onClick={() => onViz('eq-split')}
          >
            <EqSplitIcon />
          </IconButton>
        ) : null}
        {SHOW_UNFINISHED_VIEWS && !minimal ? (
          <IconButton
            label={t.waveform.tracksTitle}
            caption={t.waveform.tracks}
            pressed={viz === 'mix-split'}
            onClick={() => onViz('mix-split')}
          >
            <MixSplitIcon />
          </IconButton>
        ) : null}
        <IconButton
          label="Automation"
          caption={t.waveform.automationCaption}
          pressed={viz === 'automation'}
          onClick={() => onViz('automation')}
        >
          <AutomationIcon />
        </IconButton>
        </div>
      </div>
      {!minimal ? (
        <div className={styles.zoom}>
          <button type="button" className={styles.icon} aria-label={t.waveform.zoomOut} onClick={onZoomOut}>
            −
          </button>
          <span
            title={t.waveform.scrollZoom}
            onWheel={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (event.deltaY > 0) onZoomOut()
              else onZoomIn()
            }}
          >
            {zoomLabel}
          </span>
          <button type="button" className={styles.icon} aria-label={t.waveform.zoomIn} onClick={onZoomIn}>
            +
          </button>
        </div>
      ) : null}
    </div>
  )
}

function IconButton({
  label,
  caption,
  pressed,
  onClick,
  children,
}: {
  label: string
  caption: string
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
      <span className={styles.caption}>{caption}</span>
    </button>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4 13.5l.8-3.2 6.4-6.4a1.2 1.2 0 0 1 1.7 1.7L6.5 12l-3.2.8zM11.2 4.2l1.7 1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AutoFadeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M3 14V4l5 5 5-5v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TrimIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M3 3v12M15 3v12M3 9h3.5M11.5 9H15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="6.5" y="6" width="5" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
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
      <path d="M1.5 3.25h11M1.5 14.75h11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M2 9c1.1-4.4 1.9 4.4 3.1 0s1.9 4.4 3.1 0 1.8 4.4 3 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M14.2 6.4 16 4.4l1.8 2M14.2 11.6 16 13.6l1.8-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function MultiWaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2 5c1.5-3 2.2 3 3.6 0s2.2 3 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 9c1.5-3 2.2 3 3.6 0s2.2 3 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 13c1.5-3 2.2 3 3.6 0s2.2 3 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
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

function EqSplitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 9h14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 9v6M10 9v6M14 9v6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function MixSplitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 13V8M9 13V6M12 13V9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function AutomationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M2.5 13.5 6.2 6.2 11 10.2 15.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="2.5" cy="13.5" r="1.15" fill="currentColor" />
      <circle cx="6.2" cy="6.2" r="1.15" fill="currentColor" />
      <circle cx="11" cy="10.2" r="1.15" fill="currentColor" />
      <circle cx="15.5" cy="4" r="1.15" fill="currentColor" />
    </svg>
  )
}
