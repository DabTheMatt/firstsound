import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  LFO_RATE_DEFAULT,
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  fxLfoKindForParam,
  type FxLfo,
  type FxLfoKind,
  type LfoShape,
} from '../../audio/fx/lfo'
import { fromNormalized, toNormalized } from '../../audio/parameters/mapping'
import type { ParamDef, ParamId } from '../../audio/parameters/types'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { PARAMS } from '../../audio/parameters/definitions'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { LfoShapePicker } from '../controls/LfoShapePicker'
import { useModulationScope } from '../controls/LfoParamShell'
import { FxLfoSection } from '../inspector/FxLfoSection'
import { lockModulationGesture, type ModulationPress } from '../mobile/gestureIntent'
import {
  connectParameterLfo,
  removeParameterLfo,
  setParameterLfoEnabled,
  setParameterLfoPrimary,
} from './modulationActions'
import {
  modulationEditorView,
  modulationPortalOwner,
  preferModulationPortal,
  releaseModulationPortal,
  setModulationEditorOpen,
  subscribeModulationEditor,
} from './modulationEditor'
import { MobileModulationSheet } from './MobileModulationSheet'
import { LfoRandomActions } from '../random/LfoRandomActions'
import { modulationAffordanceModel, parameterModulationState, type ModulationSourceId } from './modulationModel'
import styles from './Modulation.module.css'

const RATE_DEF: ParamDef = {
  id: 'delayModRate',
  label: 'Rate',
  min: LFO_RATE_MIN,
  max: LFO_RATE_MAX,
  defaultValue: LFO_RATE_DEFAULT,
  unit: 'Hz',
  mapping: 'log',
}

type Props = {
  id: ParamId
  /** Sits in the knob column, between the dial and the stored value. */
  compact?: boolean
  /** Phone row: compact glyph, 44px target, bottom sheet. Same LFO bank. */
  touch?: boolean
}

export function ModulationAffordance({ id, compact = false, touch = false }: Props) {
  const snap = useEngine()
  const { paramLabel, t } = useI18n()
  const portalToken = useId()
  const editorView = useSyncExternalStore(
    subscribeModulationEditor,
    () => modulationEditorView(id),
    () => '0:',
  )
  const editorOpen = editorView.startsWith('1')
  const ownsPortal = editorView.slice(2) === portalToken
  const def = PARAMS[id]
  const state = parameterModulationState({
    lfos: snap.fxLfos,
    automation: snap.automation,
    paramId: id,
    baseNormalized: toNormalized(snap.params[id], def),
    editorOpen,
  })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const press = useRef<{ x: number; y: number; id: number; role: ModulationPress } | null>(null)
  const closeEditor = () => {
    releaseModulationPortal(id, portalToken)
    setModulationEditorOpen(id, false)
  }
  const toggleEditor = () => {
    if (editorOpen) closeEditor()
    else {
      preferModulationPortal(id, portalToken)
      setModulationEditorOpen(id, true)
    }
  }
  useEffect(() => {
    if (!editorOpen || ownsPortal || modulationPortalOwner(id) != null) return
    preferModulationPortal(id, portalToken)
  }, [editorOpen, id, ownsPortal, portalToken])
  useEffect(() => () => releaseModulationPortal(id, portalToken), [id, portalToken])
  const label = paramLabel(id)
  const kind = fxLfoKindForParam(id)

  if (!state.supportsModulation) return null

  if (touch) {
    const face = modulationAffordanceModel(state)
    const tip = t.modulation.affordance(label, face.depthLabel, face.automationMark)
    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          className={styles.touch}
          data-active={state.lfoActive ? 'true' : 'false'}
          data-open={editorOpen ? 'true' : 'false'}
          data-automation={face.automationMark ? 'true' : 'false'}
          data-modulation-for={id}
          data-modulation-presentation="touch"
          aria-expanded={editorOpen}
          aria-haspopup="dialog"
          aria-label={tip}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse') return
            press.current = { x: event.clientX, y: event.clientY, id: event.pointerId, role: 'pending' }
          }}
          onPointerMove={(event) => {
            const active = press.current
            if (!active || active.id !== event.pointerId) return
            active.role = lockModulationGesture(active.role, event.clientX - active.x, event.clientY - active.y)
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const active = press.current
            press.current = null
            if (active && active.role !== 'pending') return
            toggleEditor()
          }}
        >
          <span className={styles.mark} aria-hidden="true">
            〰
          </span>
          {face.depthLabel ? <span className={styles.depth}>{face.depthLabel}</span> : null}
          {face.automationMark ? <span className={styles.autoDot} aria-hidden="true" /> : null}
        </button>
        {editorOpen && ownsPortal && typeof document !== 'undefined' ? (
          <MobileModulationSheet id={id} label={label} onClose={closeEditor} />
        ) : null}
      </>
    )
  }

  const lfo = state.binding ? snap.fxLfos[state.binding.kind][state.binding.slot] ?? null : null
  const tip = `Modulate ${label}`
  const panel =
    editorOpen && ownsPortal && typeof document !== 'undefined' ? (
      <ModulationEditorSession
        buttonRef={buttonRef}
        id={id}
        label={label}
        kind={kind}
        snap={snap}
        lfo={lfo}
        lfoConnected={state.isLfoConnected}
        automationActive={state.automationActive}
        onClose={closeEditor}
      />
    ) : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={compact ? `${styles.button} ${styles.buttonCompact}` : styles.button}
        data-active={state.lfoActive ? 'true' : 'false'}
        data-open={editorOpen ? 'true' : 'false'}
        data-modulation-for={id}
        aria-expanded={editorOpen}
        aria-haspopup="dialog"
        aria-label={tip}
        title={compact ? undefined : tip}
        onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggleEditor()
        }}
      >
        <span className={styles.mark} aria-hidden="true">
          〰
        </span>
      </button>
      {panel}
    </>
  )
}

function ModulationEditorSession({
  buttonRef,
  id,
  label,
  kind,
  snap,
  lfo,
  lfoConnected,
  automationActive,
  onClose,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>
  id: ParamId
  label: string
  kind: FxLfoKind | null
  snap: EngineSnapshot
  lfo: FxLfo | null
  lfoConnected: boolean
  automationActive: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const scope = useModulationScope()
  const titleId = useId()
  const [source, setSource] = useState<ModulationSourceId | null>(lfoConnected ? 'lfo' : null)
  const [advanced, setAdvanced] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  const shownSource = source ?? (lfoConnected ? 'lfo' : null)
  const close = useEffectEvent(() => onClose())

  useEffect(() => {
    const place = () => {
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const width = 280
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
      const panelHeight = panelRef.current?.offsetHeight ?? 220
      const below = rect.bottom + 6
      const top = below + panelHeight > window.innerHeight - 8 ? Math.max(8, rect.top - panelHeight - 6) : below
      setBox((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
    }
    const frame = window.requestAnimationFrame(place)
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
      buttonRef.current?.focus()
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [buttonRef, id, advanced, shownSource, lfoConnected, automationActive])

  useEffect(() => {
    if (!box) return
    panelRef.current?.focus()
  }, [box])

  if (!box) return null
  return createPortal(
    <ModulatePanel
      panelRef={panelRef}
      titleId={titleId}
      label={label}
      top={box.top}
      left={box.left}
      shownSource={shownSource}
      lfoConnected={lfoConnected}
      automationActive={automationActive}
      lfo={lfo}
      kind={kind}
      snap={snap}
      paramId={id}
      onChooseLfo={() => {
        setSource('lfo')
        if (!lfoConnected) connectParameterLfo(engine, id, scope)
      }}
      onChooseAutomation={() => {
        setSource('automation')
        engine.setAutomationParam(id)
      }}
      onAddAutomation={() => engine.armAutomation(id)}
      onRate={(hz) => setParameterLfoPrimary(engine, id, { rateHz: hz })}
      onDepth={(depth) => setParameterLfoPrimary(engine, id, { depth })}
      onShape={(shape) => setParameterLfoPrimary(engine, id, { shape })}
      onToggleEnabled={() => setParameterLfoEnabled(engine, id, lfo?.enabled === false)}
      advanced={advanced}
      onToggleAdvanced={() => setAdvanced((value) => !value)}
      onRemove={() => removeParameterLfo(engine, id)}
    />,
    document.body,
  )
}

function ModulatePanel({
  panelRef,
  titleId,
  label,
  paramId,
  top,
  left,
  shownSource,
  lfoConnected,
  automationActive,
  lfo,
  kind,
  snap,
  onChooseLfo,
  onChooseAutomation,
  onAddAutomation,
  onRate,
  onDepth,
  onShape,
  onToggleEnabled,
  advanced,
  onToggleAdvanced,
  onRemove,
}: {
  panelRef: RefObject<HTMLDivElement | null>
  titleId: string
  label: string
  paramId: ParamId
  top: number
  left: number
  shownSource: ModulationSourceId | null
  lfoConnected: boolean
  automationActive: boolean
  lfo: FxLfo | null
  kind: FxLfoKind | null
  snap: EngineSnapshot
  onChooseLfo: () => void
  onChooseAutomation: () => void
  onAddAutomation: () => void
  onRate: (hz: number) => void
  onDepth: (depth: number) => void
  onShape: (shape: LfoShape) => void
  onToggleEnabled: () => void
  advanced: boolean
  onToggleAdvanced: () => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const rateHz = lfo?.rateHz ?? LFO_RATE_DEFAULT
  const depth = lfo?.depth ?? 0
  const rateText = `${rateHz < 10 ? rateHz.toFixed(2) : rateHz.toFixed(1)} Hz`
  const lfoEnabled = lfoConnected && lfo?.enabled !== false
  return (
    <div
      ref={panelRef}
      className={styles.editor}
      style={{ top, left }}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-modulation-editor="true"
    >
      <h2 id={titleId} className={styles.title}>
        Modulate {label}
      </h2>
      <div className={styles.sources}>
        <div className={styles.source} data-selected={shownSource === 'lfo' ? 'true' : 'false'}>
          <button
            type="button"
            className={styles.sourcePick}
            aria-pressed={shownSource === 'lfo'}
            aria-label={lfoConnected ? 'LFO, connected' : 'LFO'}
            onClick={onChooseLfo}
          >
            LFO
          </button>
          <LfoRandomActions id={paramId} />
          {lfoConnected ? (
            <button
              type="button"
              className={styles.statusToggle}
              aria-pressed={lfoEnabled}
              aria-label={lfoEnabled ? t.modulation.activeAria : t.modulation.inactiveAria}
              onClick={onToggleEnabled}
            >
              {lfoEnabled ? t.modulation.active : t.modulation.inactive}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.source}
          aria-pressed={shownSource === 'automation'}
          aria-label={automationActive ? 'Automation, active' : 'Automation'}
          onClick={onChooseAutomation}
        >
          <span>Automation</span>
          {automationActive ? <span className={styles.status}>Active</span> : null}
        </button>
      </div>
      {shownSource === 'lfo' && lfoConnected && lfo ? (
        <div className={styles.primary}>
          <label className={styles.field}>
            Rate
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={toNormalized(rateHz, RATE_DEF)}
              aria-label="LFO rate"
              onChange={(event) => onRate(fromNormalized(Number(event.target.value), RATE_DEF))}
            />
            <span>{rateText}</span>
          </label>
          <label className={styles.field}>
            Depth
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(depth)}
              aria-label="LFO depth"
              onChange={(event) => onDepth(Number(event.target.value))}
            />
            <span>{Math.round(depth)}%</span>
          </label>
          <LfoShapePicker value={lfo.shape} compact onChange={onShape} />
        </div>
      ) : null}
      {shownSource === 'automation' ? (
        <>
          <p className={styles.note}>
            {automationActive
              ? 'Automation is active on this parameter. Its curve stays separate from the LFO.'
              : 'No automation on this parameter yet.'}
          </p>
          {automationActive ? null : (
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={onAddAutomation}>
                Add automation
              </button>
            </div>
          )}
        </>
      ) : null}
      <div className={styles.actions}>
        {kind ? (
          <button type="button" className={styles.ghost} aria-expanded={advanced} onClick={onToggleAdvanced}>
            Advanced
          </button>
        ) : null}
        {lfoConnected ? (
          <button type="button" className={styles.remove} onClick={onRemove}>
            Remove modulation
          </button>
        ) : null}
      </div>
      {advanced && kind ? (
        <div className={styles.advanced}>
          <FxLfoSection snap={snap} kind={kind} variant="slider" omitPrimary embedded />
        </div>
      ) : null}
    </div>
  )
}
