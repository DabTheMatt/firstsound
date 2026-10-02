import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  EMPTY_AUTOMATION_FOCUS,
  automatedLanes,
  automationColor,
  automationEffectGroups,
  colorIndexForParam,
  effectKindForParam,
  envelopeToParam,
  nodeCurve,
  sampleEnvelope,
  segmentIdForNode,
  type AutomationEditFocus,
} from '../../audio/automation/automation'
import { EQ_FILTER_TYPES, EQ_MAX_BANDS, planEqBandInsert, type EqFilterType } from '../../audio/engine/eqBands'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import { formatTimecode } from '../../audio/engine/formatTime'
import type { FxLfoKind } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import type { VizMode } from '../../app/editorState'
import type { FocusWorkspace } from '../../app/phoneWorkspace'
import { toNormalized } from '../../audio/parameters/mapping'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { ModulationAffordance } from '../modulation/ModulationAffordance'
import { automationFocusLfoCue, parameterModulationState } from '../modulation/modulationModel'
import { automationEffectLabel, automationLaneTitle } from '../waveform/automationLabels'
import { formatAutomationNodeValue } from '../waveform/automationValue'
import { SegmentCurveControl } from '../waveform/SegmentCurveControl'
import styles from './FocusChrome.module.css'

export type WaveFocusActions = {
  canCopy: boolean
  canCut: boolean
  canPaste: boolean
  canDelete: boolean
  canMute: boolean
  canClear: boolean
  canInsert: boolean
  canUndo: boolean
  canRedo: boolean
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onMute: () => void
  onClear: () => void
  onTrim: () => void
  onInsertSilence: () => void
  onUndo: () => void
  onRedo: () => void
  onFadeIn: () => void
  onFadeOut: () => void
}

type Props = {
  workspace: FocusWorkspace
  playing: boolean
  canPlay: boolean
  onTogglePlay: () => void
  onExit: () => void
  onSelectModule: (instanceId: string) => void
  edit: WaveFocusActions
  autoFocus: AutomationEditFocus
  onAutoFocus: (focus: AutomationEditFocus) => void
  onAutomationCommit: () => void
  onAddNode: () => void
  onDeleteNode: () => void
  /** Desktop can switch the focused task without leaving Focus Mode. */
  onViz?: (viz: VizMode) => void
  /** Phone uses the shared touch modulation sheet. Desktop uses the shared popover. */
  touch?: boolean
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
  onAutoFocus,
  onAutomationCommit,
  onAddNode,
  onDeleteNode,
  onViz,
  touch = false,
}: Props) {
  const { t } = useI18n()
  const title =
    workspace === 'eq' ? t.focus.eq : workspace === 'auto' ? t.focus.auto : workspace === 'fft' ? t.focus.fft : t.focus.wave

  return (
    <div className={styles.chrome} data-focus-chrome={workspace}>
      <div className={styles.top}>
        {onViz ? null : <span className={styles.title}>{title}</span>}
        {onViz ? <WorkspaceSwitch workspace={workspace} onViz={onViz} /> : null}
        <div className={styles.tools}>
          {workspace === 'eq' ? <EqTools onSelectModule={onSelectModule} /> : null}
          {workspace === 'auto' ? (
            <AutoTools
              autoFocus={autoFocus}
              onAutoFocus={onAutoFocus}
              onAutomationCommit={onAutomationCommit}
              onAddNode={onAddNode}
              onDeleteNode={onDeleteNode}
              touch={touch}
            />
          ) : null}
          {workspace === 'wave' ? <WaveTools edit={edit} /> : null}
          <button
            type="button"
            className={styles.hit}
            aria-label={playing ? t.transport.pause : t.transport.play}
            title={playing ? t.transport.pause : t.transport.play}
            aria-pressed={playing}
            disabled={!canPlay}
            onClick={onTogglePlay}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" className={styles.restore} onClick={onExit}>
            {t.focus.restore}
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkspaceSwitch({ workspace, onViz }: { workspace: FocusWorkspace; onViz: (viz: VizMode) => void }) {
  const { t } = useI18n()
  const items: { id: FocusWorkspace; viz: VizMode; label: string }[] = [
    { id: 'wave', viz: 'waveform', label: t.focus.wave },
    { id: 'eq', viz: 'eq-split', label: t.focus.eq },
    { id: 'fft', viz: 'spectrum', label: t.focus.fft },
    { id: 'auto', viz: 'automation', label: t.focus.auto },
  ]
  return (
    <div className={styles.switcher} role="tablist" aria-label={t.waveform.viewGroup}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          className={styles.switch}
          aria-selected={workspace === item.id}
          onClick={() => onViz(item.viz)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function EqTools({ onSelectModule }: { onSelectModule: (instanceId: string) => void }) {
  const { t } = useI18n()
  const snap = useEngine()
  const [selected, setSelected] = useState<EqBandSelection | null>(null)
  useEffect(() => subscribeEqBandSelection(setSelected), [])
  const eq =
    snap.chain.find((mod) => mod.instanceId === selected?.instanceId && mod.type === 'eq') ??
    snap.chain.find((mod) => mod.type === 'eq')
  const bands = eq ? (snap.eqById[eq.instanceId]?.bands ?? []) : []
  const index = eq && selected?.instanceId === eq.instanceId ? selected.index : -1
  const band = index >= 0 ? bands[index] : undefined
  const active = band && band.type !== 'off' ? band : null
  const canAdd = !eq || (bands.length < EQ_MAX_BANDS && planEqBandInsert(bands) != null)

  const addBand = () => {
    const live = engine.getSnapshot()
    let id = live.chain.find((mod) => mod.type === 'eq')?.instanceId ?? null
    if (!id) id = engine.insertModule('eq', Math.max(0, live.chain.length - 2))
    if (!id) return
    const created = engine.createEqStrip('peaking', id)
    if (created == null) return
    selectEqBand({ instanceId: id, index: created })
    onSelectModule(id)
  }

  return (
    <div className={styles.cluster} data-eq-focus="">
      <button type="button" className={styles.hit} aria-label={t.mobile.addBand} title={t.mobile.addBand} disabled={!canAdd} onClick={addBand}>
        +
      </button>
      {eq && active ? (
        <select
          className={styles.lane}
          aria-label={t.mobile.type}
          value={active.type}
          onChange={(event) => {
            engine.setEqBand(index, { type: event.target.value as EqFilterType }, eq.instanceId)
          }}
        >
          {EQ_FILTER_TYPES.filter((item) => item.value !== 'off').map((item) => (
            <option key={item.value} value={item.value}>
              {item.short}
            </option>
          ))}
        </select>
      ) : null}
      {eq && active ? (
        <button
          type="button"
          className={styles.hit}
          aria-label={t.focus.deleteNode}
          title={t.focus.deleteNode}
          onClick={() => {
            engine.setEqBand(index, { type: 'off' }, eq.instanceId)
            selectEqBand(null)
          }}
        >
          <TrashIcon />
        </button>
      ) : null}
    </div>
  )
}

function AutoTools({
  autoFocus,
  onAutoFocus,
  onAutomationCommit,
  onAddNode,
  onDeleteNode,
  touch,
}: {
  autoFocus: AutomationEditFocus
  onAutoFocus: (focus: AutomationEditFocus) => void
  onAutomationCommit: () => void
  onAddNode: () => void
  onDeleteNode: () => void
  touch: boolean
}) {
  const { t, paramLabel } = useI18n()
  const snap = useEngine()
  const groups = automationEffectGroups()
  const lanes = automatedLanes(snap.automation)
  const selected = snap.automation.selectedParamId
  const selectedKind = effectKindForParam(selected) ?? groups[0]?.kind ?? 'input'
  const [addOpen, setAddOpen] = useState(false)
  const [effect, setEffect] = useState<FxLfoKind>(selectedKind)
  const taken = new Set(lanes.map((lane) => lane.paramId))
  const effectParams = groups.find((group) => group.kind === effect)?.paramIds ?? []
  const available = effectParams.filter((id) => !taken.has(id))
  const [draftParam, setDraftParam] = useState<ParamId | null>(available[0] ?? null)
  const draft = available.includes(draftParam as ParamId) ? draftParam : (available[0] ?? null)
  const lane = lanes.find((item) => item.paramId === selected) ?? null
  const nodes = [...(lane?.nodes ?? [])].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  const selectedNode = nodes.find((node) => node.id === autoFocus.nodeId) ?? null
  const segment = nodes.find((node) => node.id === autoFocus.segmentId) ?? null
  const segmentIndex = segment ? nodes.findIndex((node) => node.id === segment.id) : -1
  const hasSegment = segmentIndex >= 0 && segmentIndex < nodes.length - 1
  const titleFor = (paramId: ParamId) => {
    const kind = effectKindForParam(paramId)
    const effectName = kind ? automationEffectLabel(kind, t.modules, t.waveform.automationComb) : paramId
    return automationLaneTitle(effectName, paramLabel(paramId))
  }
  const title = lane ? titleFor(selected) : t.focus.lane
  const def = PARAMS[selected]
  const playhead = engine.getPlayheadSeconds()
  const valueSource = selectedNode?.value ?? (nodes.length > 0 ? sampleEnvelope(nodes, playhead) : null)
  const valueLabel = def && valueSource != null ? formatAutomationNodeValue(envelopeToParam(selected, valueSource), def) : ''
  const color = automationColor(colorIndexForParam(snap.automation, selected))
  const lfoCue = automationFocusLfoCue(
    parameterModulationState({
      lfos: snap.fxLfos,
      automation: snap.automation,
      paramId: selected,
      baseNormalized: def ? toNormalized(snap.params[selected], def) : 0,
      editorOpen: false,
    }),
  )

  useEffect(() => {
    if (!addOpen) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as HTMLElement | null
      if (node?.closest('[data-automation-focus-add]')) return
      setAddOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [addOpen])

  const openAdd = () => {
    setEffect(selectedKind)
    const next = groups.find((group) => group.kind === selectedKind)?.paramIds.find((id) => !taken.has(id)) ?? null
    setDraftParam(next)
    setAddOpen(true)
  }

  const addParameter = () => {
    if (!draft || taken.has(draft)) return
    engine.armAutomation(draft)
    const created = engine.getSnapshot().automation.lanes.find((item) => item.paramId === draft)
    const createdNodes = [...(created?.nodes ?? [])].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    onAutoFocus({ nodeId: null, segmentId: segmentIdForNode(createdNodes, createdNodes[0]?.id ?? null) })
    onAutomationCommit()
    setAddOpen(false)
  }

  return (
    <div className={styles.cluster} data-auto-focus="">
      <select
        className={styles.lane}
        data-lane-select=""
        aria-label={t.focus.lane}
        value={lane ? selected : ''}
        disabled={lanes.length === 0}
        onChange={(event) => {
          engine.setAutomationParam(event.target.value as ParamId)
          onAutoFocus({ nodeId: null, segmentId: null })
        }}
      >
        {lanes.length === 0 ? <option value="">{t.focus.lane}</option> : null}
        {lanes.map((item) => (
          <option key={item.paramId} value={item.paramId}>
            {titleFor(item.paramId)}
          </option>
        ))}
      </select>
      <div className={styles.anchor} data-automation-focus-add="">
        <button
          type="button"
          className={styles.hit}
          aria-label={t.focus.addAutomation}
          title={t.focus.addAutomation}
          aria-expanded={addOpen}
          onClick={() => (addOpen ? setAddOpen(false) : openAdd())}
        >
          +
        </button>
        {addOpen ? (
          <form
            className={styles.popover}
            onSubmit={(event) => {
              event.preventDefault()
              addParameter()
            }}
          >
            <h2>{t.focus.addAutomation}</h2>
            <label className={styles.field}>
              {t.waveform.automationEffect}
              <select
                value={effect}
                onChange={(event) => {
                  const kind = event.target.value as FxLfoKind
                  setEffect(kind)
                  const next = groups.find((group) => group.kind === kind)?.paramIds.find((id) => !taken.has(id)) ?? null
                  setDraftParam(next)
                }}
              >
                {groups.map((group) => (
                  <option key={group.kind} value={group.kind}>
                    {automationEffectLabel(group.kind, t.modules, t.waveform.automationComb)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              {t.waveform.automationParameter}
              <select
                value={draft ?? ''}
                disabled={!draft}
                onChange={(event) => setDraftParam(event.target.value as ParamId)}
              >
                {available.map((id) => (
                  <option key={id} value={id}>
                    {paramLabel(id)}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.formActions}>
              <button type="button" onClick={() => setAddOpen(false)}>
                {t.waveform.automationCancel}
              </button>
              <button type="submit" disabled={!draft}>
                {t.waveform.automationAddAction}
              </button>
            </div>
          </form>
        ) : null}
      </div>
      <button type="button" className={styles.hit} aria-label={t.focus.addNode} title={t.focus.addNode} disabled={!lane} onClick={onAddNode}>
        <NodeIcon />
      </button>
      <button
        type="button"
        className={styles.hit}
        aria-label={t.focus.deleteNode}
        title={t.focus.deleteNode}
        disabled={!selectedNode}
        onClick={() => {
          onDeleteNode()
          onAutoFocus(EMPTY_AUTOMATION_FOCUS)
        }}
      >
        <TrashIcon />
      </button>
      {hasSegment && segment ? (
        <SegmentCurveControl
          value={nodeCurve(segment)}
          labels={{
            step: t.waveform.automationStep,
            linear: t.waveform.automationLinear,
            smooth: t.waveform.automationSmooth,
            group: t.waveform.automationSegmentCurve,
          }}
          accent={color}
          showLabels
          onChange={(curve) => {
            engine.setAutomationCurve(segment.id, curve)
          }}
          onCommit={onAutomationCommit}
        />
      ) : null}
      {lfoCue.visible ? (
        <span className={styles.lfoCue} data-auto-lfo="" data-focus-mod="">
          <ModulationAffordance id={selected} compact={!touch} touch={touch} />
          {touch || !lfoCue.depthLabel ? null : <span className={styles.lfoDepth}>{lfoCue.depthLabel}</span>}
        </span>
      ) : null}
      <p className={styles.meta} data-auto-readout="">
        <span>{title}</span>
        <strong>{selectedNode ? `${formatTimecode(selectedNode.time)}  ${valueLabel}` : valueLabel}</strong>
      </p>
    </div>
  )
}

function WaveTools({ edit }: { edit: WaveFocusActions }) {
  const { t } = useI18n()
  const [more, setMore] = useState(false)
  const menuId = useId()
  const selection = edit.canClear

  useEffect(() => {
    if (!more) return
    const onPointer = (event: PointerEvent) => {
      const node = event.target as HTMLElement | null
      if (node?.closest('[data-wave-more]')) return
      setMore(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMore(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [more])

  return (
    <div className={styles.cluster} data-wave-focus="">
      <Icon label={t.waveform.edit} pressed>
        <EditIcon />
      </Icon>
      <Icon label={t.waveform.undo} disabled={!edit.canUndo} onClick={edit.onUndo}>
        <UndoIcon />
      </Icon>
      <Icon label={t.waveform.redo} disabled={!edit.canRedo} onClick={edit.onRedo}>
        <RedoIcon />
      </Icon>
      {edit.canPaste ? (
        <Icon label={t.waveform.pastePlayhead} onClick={edit.onPaste}>
          <PasteIcon />
        </Icon>
      ) : null}
      {selection ? (
        <>
          <Icon label={t.waveform.cutSelection} disabled={!edit.canCut} onClick={edit.onCut}>
            <CutIcon />
          </Icon>
          <Icon label={t.waveform.copySelection} disabled={!edit.canCopy} onClick={edit.onCopy}>
            <CopyIcon />
          </Icon>
          <Icon label={t.waveform.muteSelection} disabled={!edit.canMute} onClick={edit.onMute}>
            <MuteIcon />
          </Icon>
          <Icon label={t.waveform.deleteSelection} disabled={!edit.canDelete} onClick={edit.onDelete}>
            <TrashIcon />
          </Icon>
          <Icon label={t.waveform.fadeIn} onClick={edit.onFadeIn}>
            <FadeInIcon />
          </Icon>
          <Icon label={t.waveform.fadeOut} onClick={edit.onFadeOut}>
            <FadeOutIcon />
          </Icon>
        </>
      ) : null}
      <div className={styles.anchor} data-wave-more="">
        <Icon label={t.focus.more} pressed={more} onClick={() => setMore((open) => !open)}>
          ···
        </Icon>
        {more ? (
          <div className={styles.menu} id={menuId} role="menu">
            <button type="button" role="menuitem" onClick={() => { edit.onTrim(); setMore(false) }}>
              {t.waveform.trimTitle}
            </button>
            <button type="button" role="menuitem" disabled={!edit.canInsert} onClick={() => { edit.onInsertSilence(); setMore(false) }}>
              {t.waveform.insertSilence}
            </button>
            <button type="button" role="menuitem" disabled={!edit.canClear} onClick={() => { edit.onClear(); setMore(false) }}>
              {t.waveform.clearSelection}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Icon({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={styles.hit}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {children}
    </svg>
  )
}

function PlayIcon() {
  return (
    <Svg>
      <path d="M5 3.5v9l7-4.5-7-4.5z" fill="currentColor" />
    </Svg>
  )
}

function PauseIcon() {
  return (
    <Svg>
      <path d="M4.5 3.5h2.2v9H4.5zm4.8 0h2.2v9H9.3z" fill="currentColor" />
    </Svg>
  )
}

function EditIcon() {
  return (
    <Svg>
      <path d="M3 13.2 3.4 10.4 10.2 3.6l2.2 2.2-6.8 6.8Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  )
}

function UndoIcon() {
  return (
    <Svg>
      <path d="M6 4.2 3.2 7 6 9.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3.6 7H10a3 3 0 0 1 0 6H8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}

function RedoIcon() {
  return (
    <Svg>
      <path d="M10 4.2 12.8 7 10 9.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.4 7H6a3 3 0 0 0 0 6h2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}

function CutIcon() {
  return (
    <Svg>
      <circle cx="4.2" cy="11.2" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.2" cy="4.8" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.6 6.2 13 12.2M5.6 9.8 13 3.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  )
}

function CopyIcon() {
  return (
    <Svg>
      <rect x="5.5" y="4.5" width="7" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 4.5V3.2A1 1 0 0 0 9.5 2.2H3.8A1 1 0 0 0 2.8 3.2v7.2a1 1 0 0 0 1 1H5.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </Svg>
  )
}

function PasteIcon() {
  return (
    <Svg>
      <path d="M6 2.8h4v1.6H6z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="4" y="3.6" width="8" height="9.4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </Svg>
  )
}

function MuteIcon() {
  return (
    <Svg>
      <path d="M3 6.2h2.2L8.2 3.6v8.8L5.2 9.8H3z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M11 6.2 14 9.2M14 6.2 11 9.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  )
}

function TrashIcon() {
  return (
    <Svg>
      <path d="M3.2 4.5h9.6M6.2 4.5V3.2h3.6v1.3M4.4 4.5l.6 8.2h6l.6-8.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  )
}

function NodeIcon() {
  return (
    <Svg>
      <circle cx="4" cy="11" r="1.5" fill="currentColor" />
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <path d="M5.2 10.2 10.8 5.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </Svg>
  )
}

function FadeInIcon() {
  return (
    <Svg>
      <path d="M2.5 12.5C6 12.5 8 4 13.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}

function FadeOutIcon() {
  return (
    <Svg>
      <path d="M2.5 3.5C8 4 10 12.5 13.5 12.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}
