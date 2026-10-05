import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { trackAccentStyle } from '../../audio/mix/tracks'
import { useEngine } from '../../hooks/useEngine'
import type { VizMode, WaveTool } from '../../app/editorState'
import { useI18n } from '../../i18n'
import { BackgroundControl } from './BackgroundControl'
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
  onCopySelection?: () => void
  onCutSelection?: () => void
  onPasteAtPlayhead?: () => void
  onInsertSilence?: () => void
  onDeleteSelection?: () => void
  onMuteSelection?: () => void
  onClearSelection?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canInsertSilence?: boolean
  canDeleteSelection?: boolean
  canMuteSelection?: boolean
  canClearSelection?: boolean
  canCopySelection?: boolean
  canCutSelection?: boolean
  canPaste?: boolean
  canUndo?: boolean
  canRedo?: boolean
  onAutoFade?: () => void
  autoFade?: boolean
  normalizeView: boolean
  minimal?: boolean
  onToggleWorkspace?: () => void
  hearingFocus?: boolean
  onHearingFocus?: () => void
  arrangement?: 'single' | 'multi'
  onArrangement?: (arrangement: 'single' | 'multi') => void
}

export type ViewAction =
  | 'fit-sample'
  | 'fit-selection'
  | 'zoom-selection'
  | 'normalize-view'
  | 'reset-zoom'

/** Commands that change the sample or the timeline. */
export const EDIT_COMMANDS = [
  'trim',
  'copy',
  'cut',
  'paste',
  'insert-silence',
  'delete-selection',
  'mute-selection',
  'clear-selection',
  'auto-fade',
  'undo',
  'redo',
] as const

/** Commands that only change how the sample is drawn. */
export const DISPLAY_COMMANDS = [
  'fit-sample',
  'fit-selection',
  'zoom-selection',
  'normalize-view',
  'reset-zoom',
  'zoom-in',
  'zoom-out',
] as const

export function commandGroup(id: string): 'edit' | 'display' | null {
  if ((EDIT_COMMANDS as readonly string[]).includes(id)) return 'edit'
  if ((DISPLAY_COMMANDS as readonly string[]).includes(id)) return 'display'
  return null
}

/** Display actions never receive the audio engine. */
export function runDisplayAction(
  action: ViewAction,
  view: {
    fitSample: () => void
    zoomSelection: () => void
    fitSelection: () => void
    resetZoom: () => void
  } | null,
  toggleNormalize: () => void,
): void {
  if (action === 'fit-sample') view?.fitSample()
  else if (action === 'zoom-selection') view?.zoomSelection()
  else if (action === 'fit-selection') view?.fitSelection()
  else if (action === 'normalize-view') toggleNormalize()
  else view?.resetZoom()
}

const TOOLS: { id: WaveTool; key: 'edit' }[] = [{ id: 'select', key: 'edit' }]

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
  onCopySelection,
  onCutSelection,
  onPasteAtPlayhead,
  onInsertSilence,
  onDeleteSelection,
  onMuteSelection,
  onClearSelection,
  onUndo,
  onRedo,
  canInsertSilence = false,
  canDeleteSelection = false,
  canMuteSelection = false,
  canClearSelection = false,
  canCopySelection = false,
  canCutSelection = false,
  canPaste = false,
  canUndo = false,
  canRedo = false,
  onAutoFade,
  autoFade = false,
  normalizeView,
  minimal = false,
  onToggleWorkspace,
  hearingFocus = false,
  onHearingFocus,
  arrangement = 'single',
  onArrangement,
}: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const accent = trackAccentStyle(snap.tracks.find((track) => track.id === snap.selectedTrackId)?.color ?? 'amber')
  const tools = TOOLS

  return (
    <div className={`${styles.bar} ${minimal ? styles.minimal : ''}`} data-waveform-toolbar="" style={accent}>
      <div className={`${styles.cluster} ${styles.tools}`} data-command-group="edit">
        <span className={styles.kicker}>{t.waveform.edit}</span>
        <div className={styles.edit}>
          {!minimal
            ? tools.map((item) => (
                <IconButton
                  key={item.id}
                  label={t.waveform[item.key]}
                  caption={t.waveform[item.key]}
                  onClick={() => onTool(item.id)}
                >
                  <EditIcon />
                </IconButton>
              ))
            : null}
          {!minimal && onTrim ? (
            <IconButton label={t.waveform.trimTitle} caption={t.waveform.trim} command="trim" onClick={onTrim}>
              <TrimIcon />
            </IconButton>
          ) : null}
          {onCopySelection ? (
            <IconButton
              label={t.waveform.copySelection}
              caption={t.waveform.copyCaption}
              command="copy"
              disabled={!canCopySelection}
              onClick={onCopySelection}
            >
              <CopyIcon />
            </IconButton>
          ) : null}
          {onCutSelection ? (
            <IconButton
              label={t.waveform.cutSelection}
              caption={t.waveform.cutCaption}
              command="cut"
              disabled={!canCutSelection}
              onClick={onCutSelection}
            >
              <CutIcon />
            </IconButton>
          ) : null}
          {onPasteAtPlayhead ? (
            <IconButton
              label={t.waveform.pastePlayhead}
              caption={t.waveform.pasteCaption}
              command="paste"
              disabled={!canPaste}
              onClick={onPasteAtPlayhead}
            >
              <PasteIcon />
            </IconButton>
          ) : null}
          <SampleEditButtons
            insertLabel={t.waveform.insertSilence}
            insertCaption={t.waveform.insertSilenceCaption}
            deleteLabel={t.waveform.deleteSelection}
            deleteCaption={t.waveform.deleteSelectionCaption}
            muteLabel={t.waveform.muteSelection}
            muteCaption={t.waveform.muteSelectionCaption}
            canInsertSilence={canInsertSilence}
            canDeleteSelection={canDeleteSelection}
            canMuteSelection={canMuteSelection}
            showInsert={!minimal}
            onInsertSilence={onInsertSilence}
            onDeleteSelection={onDeleteSelection}
            onMuteSelection={onMuteSelection}
          />
          <MoreEditsMenu
            label={t.waveform.moreEdits}
            caption={t.waveform.moreEditsCaption}
            items={[
              minimal && onTrim
                ? { id: 'trim', label: t.waveform.trimTitle, disabled: false, onClick: onTrim }
                : null,
              minimal && onInsertSilence
                ? {
                    id: 'insert-silence',
                    label: t.waveform.insertSilence,
                    disabled: !canInsertSilence,
                    onClick: onInsertSilence,
                  }
                : null,
              onClearSelection
                ? {
                    id: 'clear-selection',
                    label: t.waveform.clearSelection,
                    disabled: !canClearSelection,
                    onClick: onClearSelection,
                  }
                : null,
              onAutoFade
                ? {
                    id: 'auto-fade',
                    label: t.waveform.autoFadeTitle,
                    disabled: false,
                    pressed: autoFade,
                    onClick: onAutoFade,
                  }
                : null,
              onUndo
                ? { id: 'undo', label: t.waveform.undo, disabled: !canUndo, onClick: onUndo }
                : null,
              onRedo
                ? { id: 'redo', label: t.waveform.redo, disabled: !canRedo, onClick: onRedo }
                : null,
            ]}
          />
        </div>
      </div>
      <div className={`${styles.cluster} ${styles.display}`} data-command-group="display">
        <span className={styles.kicker}>{t.waveform.displayGroup}</span>
        <div className={styles.views}>
          <IconButton
            label={t.waveform.fitSample}
            caption={t.waveform.fit}
            command="fit-sample"
            onClick={() => onView('fit-sample')}
          >
            <FitIcon />
          </IconButton>
          {!minimal ? (
            <IconButton
              label={t.waveform.fitSelection}
              caption={t.waveform.sel}
              command="fit-selection"
              onClick={() => onView('fit-selection')}
            >
              <FitSelIcon />
            </IconButton>
          ) : null}
          <IconButton
            label={t.waveform.zoomSelection}
            caption={t.waveform.zoom}
            command="zoom-selection"
            onClick={() => onView('zoom-selection')}
          >
            <ZoomSelIcon />
          </IconButton>
          <IconButton
            label={t.waveform.normalizeView}
            caption={t.waveform.norm}
            command="normalize-view"
            pressed={normalizeView}
            onClick={() => onView('normalize-view')}
          >
            <NormIcon />
          </IconButton>
          {!minimal ? (
            <IconButton
              label={t.waveform.resetZoom}
              caption={t.waveform.reset}
              command="reset-zoom"
              onClick={() => onView('reset-zoom')}
            >
              <ResetIcon />
            </IconButton>
          ) : null}
          {!minimal ? (
            <div className={styles.zoom}>
              <button
                type="button"
                className={styles.icon}
                data-display-command="zoom-out"
                aria-label={t.waveform.zoomOut}
                onClick={onZoomOut}
              >
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
              <button
                type="button"
                className={styles.icon}
                data-display-command="zoom-in"
                aria-label={t.waveform.zoomIn}
                onClick={onZoomIn}
              >
                +
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className={`${styles.cluster} ${styles.view}`}>
        <span className={styles.kicker}>{t.waveform.viewGroup}</span>
        <BackgroundControl />
        <div className={styles.views}>
        {onArrangement ? (
          <IconButton
            label={arrangement === 'multi' ? t.mix.singleTitle : t.mix.multiTitle}
            caption={arrangement === 'multi' ? t.mix.single : t.mix.multi}
            pressed={arrangement === 'multi'}
            className={styles.arrangement}
            onClick={() => onArrangement(arrangement === 'multi' ? 'single' : 'multi')}
          >
            <MultiWaveIcon />
          </IconButton>
        ) : null}
        <IconButton
          label={t.waveform.waveTitle}
          caption={t.waveform.wave}
          pressed={viz === 'waveform'}
          onClick={() => onViz('waveform')}
        >
          <WaveIcon />
        </IconButton>
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
        <IconButton
          label="Automation"
          caption={t.waveform.automationCaption}
          pressed={viz === 'automation'}
          onClick={() => onViz('automation')}
        >
          <AutomationIcon />
        </IconButton>
        {onHearingFocus ? (
          <IconButton
            label="Hearing Access focus"
            caption={t.focus.hearing}
            pressed={hearingFocus}
            onClick={onHearingFocus}
          >
            <HearingFocusIcon />
          </IconButton>
        ) : null}
        {onToggleWorkspace ? (
          <IconButton label={t.focus.enter} caption={t.focus.caption} onClick={onToggleWorkspace}>
            <FocusIcon />
          </IconButton>
        ) : null}
        </div>
      </div>
    </div>
  )
}

function HearingFocusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M5.2 8.2a2.8 2.8 0 0 1 5.6 0c0 1.7-1.6 2-1.6 3.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 12.2v.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.2 13.2V8.2M3.8 13.2V6.2M5.4 13.2V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function FocusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 6.5V3.5H6M10 3.5h3V6.5M13 9.5v3H10M6 12.5H3V9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IconButton({
  label,
  caption,
  pressed,
  disabled = false,
  command,
  className,
  onClick,
  children,
}: {
  label: string
  caption: string
  pressed?: boolean
  disabled?: boolean
  command?: string
  className?: string
  onClick: () => void
  children: ReactNode
}) {
  const group = command ? commandGroup(command) : null
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${pressed ? styles.active : ''} ${className ?? ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      data-edit-command={group === 'edit' ? command : undefined}
      data-display-command={group === 'display' ? command : undefined}
      onClick={onClick}
    >
      {children}
      <span className={styles.caption}>{caption}</span>
    </button>
  )
}

function SampleEditButtons({
  insertLabel,
  insertCaption,
  deleteLabel,
  deleteCaption,
  muteLabel,
  muteCaption,
  canInsertSilence,
  canDeleteSelection,
  canMuteSelection,
  showInsert,
  onInsertSilence,
  onDeleteSelection,
  onMuteSelection,
}: {
  insertLabel: string
  insertCaption: string
  deleteLabel: string
  deleteCaption: string
  muteLabel: string
  muteCaption: string
  canInsertSilence: boolean
  canDeleteSelection: boolean
  canMuteSelection: boolean
  showInsert: boolean
  onInsertSilence?: () => void
  onDeleteSelection?: () => void
  onMuteSelection?: () => void
}) {
  if (!onInsertSilence && !onDeleteSelection && !onMuteSelection) return null
  return (
    <>
      {showInsert && onInsertSilence ? (
        <IconButton
          label={insertLabel}
          caption={insertCaption}
          command="insert-silence"
          disabled={!canInsertSilence}
          onClick={onInsertSilence}
        >
          <InsertSilenceIcon />
        </IconButton>
      ) : null}
      {onDeleteSelection ? (
        <IconButton
          label={deleteLabel}
          caption={deleteCaption}
          command="delete-selection"
          disabled={!canDeleteSelection}
          onClick={onDeleteSelection}
        >
          <DeleteSelectionIcon />
        </IconButton>
      ) : null}
      {onMuteSelection ? (
        <IconButton
          label={muteLabel}
          caption={muteCaption}
          command="mute-selection"
          disabled={!canMuteSelection}
          onClick={onMuteSelection}
        >
          <MuteSelectionIcon />
        </IconButton>
      ) : null}
    </>
  )
}

type MoreEditItem = {
  id: string
  label: string
  disabled: boolean
  pressed?: boolean
  onClick: () => void
}

function MoreEditsMenu({
  label,
  caption,
  items,
}: {
  label: string
  caption: string
  items: Array<MoreEditItem | null>
}) {
  const entries = items.filter((item): item is MoreEditItem => item != null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
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
  if (entries.length < 1) return null
  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.iconBtn} ${open ? styles.active : ''}`}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon />
        <span className={styles.caption}>{caption}</span>
      </button>
      {open ? (
        <div className={styles.menu} id={menuId} role="menu" aria-label={label}>
          {entries.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              data-edit-command={item.id}
              aria-pressed={item.pressed}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="6" y="3.5" width="8.5" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3.5" y="6" width="8.5" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function CutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="4.5" cy="13" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4.5" cy="5" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.2 6.4 14.5 13.2M6.2 11.6 14.5 4.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4.5" y="3.5" width="9" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 3.5h4v2H7z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 9h4M7 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="4.5" cy="9" r="1.2" fill="currentColor" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
      <circle cx="13.5" cy="9" r="1.2" fill="currentColor" />
    </svg>
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

function InsertSilenceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M1.5 9c.7-2.4 1.3 2.4 2 0s1.3 2.4 2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12.5 9c.7-2.4 1.3 2.4 2 0s1.3 2.4 2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M8 4.5v9M6.2 6.2h3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function DeleteSelectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4" y="4.5" width="10" height="9" rx="1" fill="currentColor" opacity="0.28" />
      <rect x="4" y="4.5" width="10" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.2 9h5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MuteSelectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M1.1 9c.5-2.1.9 2.1 1.4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <rect x="4.1" y="4.2" width="9.8" height="9.6" rx="1" fill="currentColor" opacity="0.18" />
      <rect x="4.1" y="4.2" width="9.8" height="9.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M6.1 9h5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M15.5 9c.5-2.1.9 2.1 1.4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
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
