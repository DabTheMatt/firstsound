import { useEffect, useId, useState } from 'react'
import {
  automatedLanes,
  envelopeToParam,
  type AutomationEditFocus,
} from '../../audio/automation/automation'
import { EQ_MAX_BANDS, planEqBandInsert } from '../../audio/engine/eqBands'
import { selectEqBand } from '../../audio/engine/eqBandSelection'
import { PARAMS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import type { FocusWorkspace } from '../../app/phoneWorkspace'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { formatAutomationNodeValue } from '../waveform/automationValue'
import { FocusToggle } from './FocusToggle'
import styles from './FocusChrome.module.css'

type EditActions = {
  canCopy: boolean
  canCut: boolean
  canDelete: boolean
  canMute: boolean
  canClear: boolean
  canUndo: boolean
  canRedo: boolean
  onCopy: () => void
  onCut: () => void
  onDelete: () => void
  onMute: () => void
  onUndo: () => void
  onRedo: () => void
}

type Props = {
  workspace: FocusWorkspace
  playing: boolean
  canPlay: boolean
  onTogglePlay: () => void
  onExit: () => void
  onSelectModule: (instanceId: string) => void
  edit: EditActions
  autoFocus: AutomationEditFocus
}

export function FocusChrome({
  workspace,
  playing,
  canPlay,
  onTogglePlay,
  onExit,
  onSelectModule,
  edit,
  autoFocus,
}: Props) {
  const { t, paramLabel } = useI18n()
  const snap = useEngine()
  const title =
    workspace === 'eq' ? 'EQ' : workspace === 'auto' ? t.waveform.automationCaption : t.waveform.wave
  const eq = snap.chain.find((mod) => mod.type === 'eq')
  const bands = eq ? (snap.eqById[eq.instanceId]?.bands ?? []) : []
  const canAdd = !eq || (bands.length < EQ_MAX_BANDS && planEqBandInsert(bands) != null)

  const addBand = () => {
    const live = engine.getSnapshot()
    let id = live.chain.find((mod) => mod.type === 'eq')?.instanceId ?? null
    if (!id) id = engine.insertModule('eq', Math.max(0, live.chain.length - 2))
    if (!id) return
    const index = engine.createEqStrip('peaking', id)
    if (index == null) return
    selectEqBand({ instanceId: id, index })
    onSelectModule(id)
  }

  return (
    <div className={styles.chrome} data-focus-chrome={workspace}>
      <div className={styles.top}>
        <span className={styles.title}>{title}</span>
        <div className={styles.tools}>
          {workspace === 'auto' ? <AutoLaneSelect /> : null}
          {workspace === 'eq' ? (
            <button type="button" className={styles.hit} aria-label={t.mobile.addBand} disabled={!canAdd} onClick={addBand}>
              +
            </button>
          ) : null}
          <button
            type="button"
            className={styles.hit}
            aria-label={playing ? t.transport.pause : t.transport.play}
            aria-pressed={playing}
            disabled={!canPlay}
            onClick={onTogglePlay}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <FocusToggle expanded onClick={onExit} />
        </div>
      </div>
      {workspace === 'auto' ? <AutoNodeReadout focus={autoFocus} paramLabel={paramLabel} /> : null}
      {workspace === 'wave' && edit.canClear ? <WaveActions edit={edit} /> : null}
    </div>
  )
}

function AutoLaneSelect() {
  const { t, paramLabel } = useI18n()
  const snap = useEngine()
  const lanes = automatedLanes(snap.automation)
  if (lanes.length < 2) return null
  return (
    <select
      className={styles.lane}
      aria-label={t.waveform.automationTitle}
      value={snap.automation.selectedParamId}
      onChange={(event) => {
        const id = lanes.find((lane) => lane.paramId === event.target.value)?.paramId
        if (id) engine.setAutomationParam(id)
      }}
    >
      {lanes.map((lane) => (
        <option key={lane.paramId} value={lane.paramId}>
          {paramLabel(lane.paramId)}
        </option>
      ))}
    </select>
  )
}

function AutoNodeReadout({
  focus,
  paramLabel,
}: {
  focus: AutomationEditFocus
  paramLabel: (id: ParamId) => string
}) {
  const snap = useEngine()
  const lane = snap.automation.lanes.find((item) => item.paramId === snap.automation.selectedParamId)
  const node = lane?.nodes.find((item) => item.id === focus.nodeId)
  const def = PARAMS[snap.automation.selectedParamId]
  if (!node || !def) return null
  const value = formatAutomationNodeValue(envelopeToParam(def.id, node.value), def)
  return (
    <p className={styles.meta} data-auto-readout="">
      {paramLabel(def.id)} {value}
    </p>
  )
}

function WaveActions({ edit }: { edit: EditActions }) {
  const { t } = useI18n()
  const [more, setMore] = useState(false)
  const menuId = useId()

  useEffect(() => {
    if (!more) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMore(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [more])

  return (
    <div className={styles.actions} data-focus-wave-actions="">
      {edit.canCut ? (
        <button type="button" className={styles.action} onClick={edit.onCut}>
          {t.waveform.cutCaption}
        </button>
      ) : null}
      {edit.canCopy ? (
        <button type="button" className={styles.action} onClick={edit.onCopy}>
          {t.waveform.copyCaption}
        </button>
      ) : null}
      {edit.canMute ? (
        <button type="button" className={styles.action} onClick={edit.onMute}>
          {t.waveform.muteSelectionCaption}
        </button>
      ) : null}
      {edit.canDelete ? (
        <button type="button" className={styles.action} onClick={edit.onDelete}>
          {t.waveform.deleteSelectionCaption}
        </button>
      ) : null}
      <div className={styles.moreWrap}>
        <button
          type="button"
          className={styles.action}
          aria-expanded={more}
          aria-controls={menuId}
          aria-label={t.waveform.moreEdits}
          onClick={() => setMore((open) => !open)}
        >
          •••
        </button>
        {more ? (
          <div className={styles.menu} id={menuId} role="menu">
            <button type="button" role="menuitem" disabled={!edit.canUndo} onClick={() => { edit.onUndo(); setMore(false) }}>
              {t.waveform.undo}
            </button>
            <button type="button" role="menuitem" disabled={!edit.canRedo} onClick={() => { edit.onRedo(); setMore(false) }}>
              {t.waveform.redo}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.5v9l7-4.5-7-4.5z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 3.5h2.2v9H4.5zm4.8 0h2.2v9H9.3z" fill="currentColor" />
    </svg>
  )
}
