import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  automatedLanes,
  automationColor,
  automationEffectGroups,
  colorIndexForParam,
  effectKindForParam,
  nodeCurve,
  nodeTension,
  segmentIdForNode,
  type AutomationCurve,
  type AutomationEditFocus,
} from '../../audio/automation/automation'
import type { FxLfoKind } from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { inspectorContextId } from '../../app/inspectorRoute'
import { InspectorEye } from '../inspector/InspectorEye'
import { inspectorAccentStyle } from '../inspector/TrackIdentity'
import inspectorStyles from '../inspector/Inspector.module.css'
import { AutomationColorPicker } from './AutomationColorPicker'
import { automationEffectLabel, automationLaneTitle } from './automationLabels'
import { SegmentCurveControl } from './SegmentCurveControl'
import styles from './AutomationInspector.module.css'

let rememberedScroll = 0

type Props = {
  sheet?: boolean
  compact?: boolean
  onHideInspector?: () => void
  onCommit?: () => void
  focus: AutomationEditFocus
  onFocus: (focus: AutomationEditFocus) => void
}

type ColorPickerState = {
  paramId: ParamId
  anchor: HTMLElement
}

export function AutomationInspector({ sheet, compact, onHideInspector, onCommit, focus, onFocus }: Props) {
  const { t, paramLabel } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = panelRef.current
    if (!node) return
    node.scrollTop = rememberedScroll
    const onScroll = () => {
      rememberedScroll = node.scrollTop
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [])
  const snap = useEngine()
  const groups = automationEffectGroups()
  const lanes = automatedLanes(snap.automation)
  const selected = snap.automation.selectedParamId
  const selectedKind = effectKindForParam(selected) ?? groups[0]?.kind ?? 'input'
  const [addOpen, setAddOpen] = useState(false)
  const [effect, setEffect] = useState<FxLfoKind>(selectedKind)
  const [pendingRemove, setPendingRemove] = useState<ParamId | null>(null)
  const [colorPicker, setColorPicker] = useState<ColorPickerState | null>(null)
  const taken = new Set(lanes.map((lane) => lane.paramId))
  const effectParams = groups.find((group) => group.kind === effect)?.paramIds ?? []
  const available = effectParams.filter((id) => !taken.has(id))
  const [draftParam, setDraftParam] = useState<ParamId | null>(available[0] ?? null)
  const draft = available.includes(draftParam as ParamId) ? draftParam : (available[0] ?? null)
  const selectedLane = lanes.find((lane) => lane.paramId === selected) ?? null
  const selectedNodes = selectedLane?.nodes ?? []
  const segmentId = selectedNodes.some((node) => node.id === focus.segmentId) ? focus.segmentId : null
  const segment = selectedNodes.find((node) => node.id === segmentId) ?? null
  const segmentIndex = segment ? [...selectedNodes].sort((a, b) => a.time - b.time).findIndex((node) => node.id === segment.id) : -1
  const hasSegment = segmentIndex >= 0 && segmentIndex < selectedNodes.length - 1
  const curve = hasSegment && segment ? nodeCurve(segment) : 'linear'
  const tension = hasSegment && segment ? nodeTension(segment) : 0
  const color = automationColor(colorIndexForParam(snap.automation, selected))
  const colorLane = colorPicker ? (lanes.find((lane) => lane.paramId === colorPicker.paramId) ?? null) : null
  const titleFor = (paramId: ParamId) => {
    const kind = effectKindForParam(paramId)
    const effectName = kind ? automationEffectLabel(kind, t.modules, t.waveform.automationComb) : paramId
    return automationLaneTitle(effectName, paramLabel(paramId))
  }
  const curveLabels = {
    step: t.waveform.automationStep,
    linear: t.waveform.automationLinear,
    smooth: t.waveform.automationSmooth,
    group: t.waveform.automationSegmentCurve,
  }

  const choose = (paramId: ParamId) => {
    engine.setAutomationParam(paramId)
    const lane = snap.automation.lanes.find((item) => item.paramId === paramId)
    const nodes = [...(lane?.nodes ?? [])].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    onFocus({ nodeId: null, segmentId: segmentIdForNode(nodes, nodes[0]?.id ?? null) })
    setPendingRemove(null)
  }

  const chooseEffect = (kind: FxLfoKind) => {
    setEffect(kind)
    const next = groups.find((group) => group.kind === kind)?.paramIds.find((id) => !taken.has(id)) ?? null
    setDraftParam(next)
  }

  const closeAdd = () => setAddOpen(false)

  const openAdd = () => {
    setEffect(selectedKind)
    const next = groups.find((group) => group.kind === selectedKind)?.paramIds.find((id) => !taken.has(id)) ?? null
    setDraftParam(next)
    setColorPicker(null)
    setAddOpen(true)
  }

  const addParameter = () => {
    if (!draft || taken.has(draft)) return
    engine.armAutomation(draft)
    const lane = engine.getSnapshot().automation.lanes.find((item) => item.paramId === draft)
    const nodes = [...(lane?.nodes ?? [])].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    onFocus({ nodeId: null, segmentId: segmentIdForNode(nodes, nodes[0]?.id ?? null) })
    onCommit?.()
    setAddOpen(false)
    setPendingRemove(null)
  }

  const removeLane = (paramId: ParamId) => {
    engine.removeAutomation(paramId)
    onCommit?.()
    setPendingRemove(null)
    if (colorPicker?.paramId === paramId) setColorPicker(null)
    if (focus.segmentId || focus.nodeId) onFocus({ nodeId: null, segmentId: null })
  }

  const setCurve = (next: AutomationCurve) => {
    if (!segmentId || !hasSegment) return
    engine.setAutomationCurve(segmentId, next)
  }

  return (
    <div
      ref={panelRef}
      className={`${inspectorStyles.panel} ${sheet ? inspectorStyles.sheet : ''} ${compact ? inspectorStyles.compact : ''}`}
      style={inspectorAccentStyle(snap)}
      data-automation-inspector="true"
      data-inspector-context={inspectorContextId({ kind: 'automation' })}
      data-inspector-track={snap.selectedTrackId}
    >
      <div className={`${inspectorStyles.head} ${styles.laneHead}`}>
        <span
          className={styles.trackBadge}
          title={snap.tracks.find((track) => track.id === snap.selectedTrackId)?.name ?? t.waveform.automationTitle}
        >
          {`T${Math.max(1, snap.tracks.findIndex((track) => track.id === snap.selectedTrackId) + 1)}`}
        </span>
        <h2 className={styles.laneTitle} title={titleFor(selected)}>
          {titleFor(selected)}
        </h2>
        {onHideInspector ? (
          <div className={inspectorStyles.headActions}>
            <InspectorEye open onClick={onHideInspector} />
          </div>
        ) : null}
      </div>

      <p className={inspectorStyles.help}>{t.waveform.automationHint}</p>

      <h3 className={inspectorStyles.sub}>{t.waveform.automationLegend}</h3>
      {lanes.length === 0 ? <p className={styles.empty}>{t.waveform.automationEmpty}</p> : null}
      <ul className={styles.list}>
        {lanes.map((lane) => {
          const active = lane.paramId === selected
          const laneIndex = typeof lane.colorIndex === 'number' ? lane.colorIndex : colorIndexForParam(snap.automation, lane.paramId)
          const laneColor = automationColor(laneIndex)
          const title = titleFor(lane.paramId)
          return (
            <li key={lane.paramId} data-automation-lane={lane.paramId}>
              <div
                className={`${styles.lane} ${active ? styles.laneOn : ''}`}
                style={{ '--lane-color': laneColor } as CSSProperties}
              >
                <button
                  type="button"
                  className={`${styles.color} ${colorPicker?.paramId === lane.paramId ? styles.colorOpen : ''}`}
                  aria-label={`${t.waveform.automationColorChoose}: ${title}`}
                  aria-haspopup="listbox"
                  aria-expanded={colorPicker?.paramId === lane.paramId}
                  title={t.waveform.automationColor}
                  data-automation-color={lane.paramId}
                  onClick={(event) => {
                    const opening = colorPicker?.paramId !== lane.paramId
                    if (opening && !active) choose(lane.paramId)
                    setColorPicker(opening ? { paramId: lane.paramId, anchor: event.currentTarget } : null)
                  }}
                >
                  <i style={{ background: laneColor }} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.laneButton}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => choose(lane.paramId)}
                >
                  <span>{title}</span>
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`${t.waveform.automationRemoveTitle} ${title}`}
                  title={t.waveform.automationRemove}
                  data-automation-remove={lane.paramId}
                  onClick={() => setPendingRemove((current) => (current === lane.paramId ? null : lane.paramId))}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              {pendingRemove === lane.paramId ? (
                <div className={styles.confirm}>
                  <p>{t.waveform.automationRemoveConfirm}</p>
                  <button type="button" className={inspectorStyles.ghost} onClick={() => removeLane(lane.paramId)}>
                    {t.waveform.automationConfirm}
                  </button>
                  <button type="button" className={inspectorStyles.ghost} onClick={() => setPendingRemove(null)}>
                    {t.waveform.automationCancel}
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {addOpen ? (
        <form
          className={styles.add}
          data-automation-add="form"
          onSubmit={(event) => {
            event.preventDefault()
            addParameter()
          }}
        >
          <label className={inspectorStyles.field}>
            <span>{t.waveform.automationEffect}</span>
            <select className={inspectorStyles.select} value={effect} onChange={(event) => chooseEffect(event.target.value as FxLfoKind)}>
              {groups.map((group) => (
                <option key={group.kind} value={group.kind}>
                  {automationEffectLabel(group.kind, t.modules, t.waveform.automationComb)}
                </option>
              ))}
            </select>
          </label>
          <label className={inspectorStyles.field}>
            <span>{t.waveform.automationParameter}</span>
            <select
              className={inspectorStyles.select}
              value={draft ?? ''}
              disabled={available.length === 0}
              onChange={(event) => setDraftParam(event.target.value as ParamId)}
            >
              {available.map((id) => (
                <option key={id} value={id}>
                  {paramLabel(id)}
                </option>
              ))}
            </select>
          </label>
          {available.length === 0 ? <p className={styles.empty}>{t.waveform.automationAllUsed}</p> : null}
          <div className={styles.addActions}>
            <button type="button" className={inspectorStyles.ghost} data-automation-add="cancel" onClick={closeAdd}>
              {t.waveform.automationCancel}
            </button>
            <button type="submit" className={`${inspectorStyles.ghost} ${inspectorStyles.ghostOn}`} data-automation-add="confirm" disabled={!draft}>
              {t.waveform.automationAddAction}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={inspectorStyles.ghost} data-automation-add="start" aria-expanded={false} onClick={openAdd}>
          + {t.waveform.automationAdd}
        </button>
      )}

      {colorLane && colorPicker ? (
        <AutomationColorPicker
          anchor={colorPicker.anchor}
          value={typeof colorLane.colorIndex === 'number' ? colorLane.colorIndex : colorIndexForParam(snap.automation, colorLane.paramId)}
          label={t.waveform.automationColorChoose}
          optionLabel={t.waveform.automationColorOption}
          onPick={(index) => {
            engine.setAutomationColor(colorLane.paramId, index)
            onCommit?.()
            setColorPicker(null)
          }}
          onClose={() => setColorPicker(null)}
        />
      ) : null}

      <h3 className={inspectorStyles.sub}>{t.waveform.automationEditing}</h3>
      <div className={inspectorStyles.readout}>
        <span>{t.waveform.automationEffect}</span>
        <strong>{automationEffectLabel(selectedKind, t.modules, t.waveform.automationComb)}</strong>
      </div>
      <div className={inspectorStyles.readout}>
        <span>{t.waveform.automationParameter}</span>
        <strong>{paramLabel(selected)}</strong>
      </div>
      <div className={inspectorStyles.readout}>
        <span>{t.waveform.automationColor}</span>
        <strong className={styles.colorValue}>
          <i className={styles.swatch} style={{ background: color }} aria-hidden="true" />
          {titleFor(selected)}
        </strong>
      </div>
      <div className={inspectorStyles.readout}>
        <span>{t.waveform.automationNodes}</span>
        <strong>{selectedLane?.nodes.length ?? 0}</strong>
      </div>

      {hasSegment && segmentId ? (
        <div className={styles.segmentCurve} data-automation-segment-curve="inspector">
          <SegmentCurveControl
            value={curve}
            labels={curveLabels}
            accent={color}
            caption={t.waveform.automationSegmentCurve}
            onChange={setCurve}
            onCommit={onCommit}
          />
        </div>
      ) : (
        <p className={styles.empty}>{t.waveform.automationSegmentHint}</p>
      )}

      {hasSegment && segmentId && curve === 'smooth' ? (
        <label className={inspectorStyles.field}>
          <span>
            {t.waveform.automationTension} {tension.toFixed(2)}
          </span>
          <input
            className={inspectorStyles.range}
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={tension}
            aria-label={t.waveform.automationTension}
            onChange={(event) => engine.setAutomationTension(segmentId, Number(event.target.value))}
            onPointerUp={() => onCommit?.()}
            onKeyUp={() => onCommit?.()}
          />
        </label>
      ) : null}
    </div>
  )
}
