import { useEffect, useState, type CSSProperties } from 'react'
import { isFixedType, type ModuleType } from '../../audio/chain/chain'
import {
  EQ_FILTER_TYPES,
  EQ_MAX_BANDS,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  bandUsesGain,
  formatEqHz,
  planEqBandInsert,
  type EqFilterType,
} from '../../audio/engine/eqBands'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { PARAMS, PLAYBACK_DIRECTIONS, STRETCH_INTERP_ALGOS } from '../../audio/parameters/definitions'
import type { ParamId } from '../../audio/parameters/types'
import type { InspectorFocus } from '../../app/editorState'
import { mobilePriority, primarySummary } from '../../app/mobilePriority'
import { engine } from '../../hooks/useEngine'
import { eqModulationParamId } from '../modulation/modulationModel'
import { useI18n } from '../../i18n'
import { ParamSlider } from '../controls/ParamSlider'
import { Toggle } from '../controls/Toggle'
import { EffectRandomMenu } from '../random/EffectRandomMenu'
import { eqBandTone, readThemeColors } from '../../theme'
import { AnalyzerSettings } from './AnalyzerSettings'
import { TouchRange } from './TouchRange'
import styles from './MobileContext.module.css'

type Level = 'summary' | 'primary' | 'secondary'

type Props = {
  snap: EngineSnapshot
  focus: InspectorFocus
  collapseToken: number
}

function isSwitch(id: ParamId): boolean {
  const def = PARAMS[id]
  return def.min === 0 && def.max === 1 && def.step === 1
}

export function MobileContext({ snap, focus, collapseToken }: Props) {
  const { t, moduleName, paramLabel } = useI18n()
  const [level, setLevel] = useState<Level>('primary')
  const [menuOpen, setMenuOpen] = useState(false)
  const [focused, setFocused] = useState<ParamId | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)
  const [eqField, setEqField] = useState<'freq' | 'gain' | 'q' | null>(null)
  const [band, setBand] = useState<EqBandSelection | null>(null)
  const [hold, setHold] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [seenToken, setSeenToken] = useState(collapseToken)
  const focusKey = focus.kind === 'module' ? `${focus.kind}:${focus.instanceId}` : focus.kind
  const focusIsEq = focus.kind === 'module' && focus.type === 'eq'
  const [seenFocus, setSeenFocus] = useState(focusKey)

  if (collapseToken !== seenToken) {
    setSeenToken(collapseToken)
    if (!hold && !focusIsEq) {
      setLevel('summary')
      setFocused(null)
      setEqField(null)
    }
  }

  if (focusKey !== seenFocus) {
    setSeenFocus(focusKey)
    setFocused(null)
    setEqField(null)
    setMenuOpen(false)
    setTypeOpen(false)
    setAnalyzerOpen(false)
    if (focusIsEq) setLevel('primary')
  }

  useEffect(() => subscribeEqBandSelection(setBand), [])

  const moduleFocus = focus.kind === 'module' ? focus : null
  const type: ModuleType | null = moduleFocus?.type ?? null
  const instanceId = moduleFocus?.instanceId ?? ''
  const mod = snap.chain.find((item) => item.instanceId === instanceId)
  const priority = type ? mobilePriority(type) : null
  const title =
    focus.kind === 'automation'
      ? t.waveform.automationCaption
      : type
        ? moduleName(type)
        : t.waveform.wave

  const expand = () => {
    setHold(true)
    setLevel('primary')
  }
  const collapse = () => {
    setHold(false)
    setLevel('summary')
    setFocused(null)
    setEqField(null)
  }

  const summary =
    type && priority
      ? primarySummary(type, snap.params)
      : focus.kind === 'automation'
        ? t.waveform.automationCaption
        : ''

  return (
    <section className={styles.panel} data-mobile-context="" data-context-level={level} aria-label={t.mobile.context}>
      <header className={styles.head}>
        <button
          type="button"
          className={styles.identity}
          aria-expanded={level !== 'summary'}
          aria-label={level === 'summary' ? t.mobile.expandContext : t.mobile.collapseContext}
          onClick={() => (level === 'summary' ? expand() : collapse())}
        >
          <span className={styles.name}>{title}</span>
          {level === 'summary' && summary ? <span className={styles.summary}>{summary}</span> : null}
          <span className={styles.chev} aria-hidden="true">
            {level === 'summary' ? '▾' : '▴'}
          </span>
        </button>
        <div className={styles.headTools}>
          {mod && !isFixedType(mod.type) ? (
            <button
              type="button"
              className={mod.bypassed ? styles.off : styles.on}
              aria-pressed={!mod.bypassed}
              onClick={() => engine.toggleModuleBypass(instanceId)}
            >
              {mod.bypassed ? t.mobile.off : t.mobile.on}
            </button>
          ) : null}
          {type === 'output' ? (
            <button
              type="button"
              className={snap.muted ? styles.off : styles.on}
              aria-pressed={snap.muted}
              onClick={() => engine.setMuted(!snap.muted)}
            >
              {snap.muted ? t.inspector.mute : t.mobile.on}
            </button>
          ) : null}
          {type ? <EffectRandomMenu type={type} /> : null}
          <button
            type="button"
            className={styles.moreBtn}
            aria-expanded={menuOpen}
            aria-label={t.mobile.more}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ···
          </button>
        </div>
      </header>
      {menuOpen && (mod || focusIsEq) ? (
        <div className={styles.menu} role="menu">
          {focusIsEq ? (
            <button
              type="button"
              role="menuitem"
              aria-pressed={analyzerOpen}
              onClick={() => {
                setAnalyzerOpen((open) => !open)
                setMenuOpen(false)
                setLevel('primary')
              }}
            >
              {t.mobile.analyzer}
            </button>
          ) : null}
          {type && type !== 'output' && type !== 'gain' ? (
            <button type="button" role="menuitem" onClick={() => engine.resetEffect(type, instanceId)}>
              {t.waveform.reset}
            </button>
          ) : null}
          {mod && !isFixedType(mod.type) ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                engine.removeModule(instanceId)
                setMenuOpen(false)
              }}
            >
              {t.inspector.remove}
            </button>
          ) : null}
        </div>
      ) : null}

      {analyzerOpen && focusIsEq ? <AnalyzerSettings /> : null}

      {level !== 'summary' && type === 'eq' ? (
        <EqStrip
          snap={snap}
          instanceId={instanceId}
          selection={band}
          typeOpen={typeOpen}
          field={eqField}
          onTypeOpen={setTypeOpen}
          onField={setEqField}
        />
      ) : null}

      {level !== 'summary' && type && type !== 'eq' && priority ? (
        <div className={styles.body}>
          {focused ? (
            <div className={styles.focus}>
              <button type="button" className={styles.back} onClick={() => setFocused(null)}>
                {t.mobile.back}
              </button>
              <ParamSlider id={focused} value={snap.params[focused]} gestureSafe />
            </div>
          ) : (
            <>
              <ParamList
                ids={priority.primary}
                snap={snap}
                labelFor={paramLabel}
                onFocus={setFocused}
              />
              {level === 'primary' && (priority.secondary.length > 0 || priority.advanced.length > 0 || type === 'gain') ? (
                <button type="button" className={styles.more} onClick={() => setLevel('secondary')}>
                  {t.mobile.more}
                </button>
              ) : null}
              {level === 'secondary' ? (
                <>
                  {type === 'gain' ? (
                    <label className={styles.field}>
                      Direction
                      <select
                        value={snap.direction}
                        aria-label="Direction"
                        onChange={(event) => {
                          const next = PLAYBACK_DIRECTIONS.find((item) => item.value === event.target.value)
                          if (next) engine.setDirection(next.value)
                        }}
                      >
                        {PLAYBACK_DIRECTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <ParamList ids={priority.secondary} snap={snap} labelFor={paramLabel} onFocus={setFocused} />
                  {type === 'gain' ? <GainAdvanced snap={snap} /> : null}
                  {priority.advanced.length > 0 ? (
                    <details className={styles.advanced}>
                      <summary>{t.inspector.advanced}</summary>
                      <ParamList ids={priority.advanced} snap={snap} labelFor={paramLabel} onFocus={setFocused} />
                    </details>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}

function ParamList({
  ids,
  snap,
  labelFor,
  onFocus,
}: {
  ids: ParamId[]
  snap: EngineSnapshot
  labelFor: (id: ParamId) => string
  onFocus: (id: ParamId) => void
}) {
  return (
    <>
      {ids.map((id) =>
        isSwitch(id) ? (
          <Toggle
            key={id}
            pressed={snap.params[id] > 0.5}
            label={labelFor(id)}
            onToggle={() => engine.setParam(id, snap.params[id] > 0.5 ? 0 : 1)}
          />
        ) : (
          <ParamSlider
            key={id}
            id={id}
            value={snap.params[id]}
            gestureSafe
            onFocusRequest={() => onFocus(id)}
          />
        ),
      )}
    </>
  )
}

function GainAdvanced({ snap }: { snap: EngineSnapshot }) {
  const { t } = useI18n()
  return (
    <>
      <label className={styles.field}>
        {t.inspector.interpolation}
        <select
          aria-label={t.inspector.interpAlgo}
          value={STRETCH_INTERP_ALGOS[Math.round(snap.params.stretchInterpAlgo)]?.value ?? 'cubic'}
          onChange={(event) => {
            const index = STRETCH_INTERP_ALGOS.findIndex((item) => item.value === event.target.value)
            if (index >= 0) engine.setParam('stretchInterpAlgo', index)
          }}
        >
          {STRETCH_INTERP_ALGOS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.value === 'linear'
                ? t.inspector.interpFast
                : item.value === 'sinc'
                  ? t.inspector.interpHigh
                  : t.inspector.interpSmooth}
            </option>
          ))}
        </select>
      </label>
      <Toggle
        pressed={snap.channelLayout === 'mono' || snap.params.makeMono > 0.5}
        label="Make mono"
        onToggle={() =>
          engine.setChannelLayout(snap.channelLayout === 'mono' || snap.params.makeMono > 0.5 ? 'original' : 'mono')
        }
      />
      <Toggle
        pressed={snap.params.invertPhase > 0.5}
        label="Invert phase"
        onToggle={() => engine.setParam('invertPhase', snap.params.invertPhase > 0.5 ? 0 : 1)}
      />
    </>
  )
}

function EqStrip({
  snap,
  instanceId,
  selection,
  typeOpen,
  field,
  onTypeOpen,
  onField,
}: {
  snap: EngineSnapshot
  instanceId: string
  selection: EqBandSelection | null
  typeOpen: boolean
  field: 'freq' | 'gain' | 'q' | null
  onTypeOpen: (open: boolean) => void
  onField: (field: 'freq' | 'gain' | 'q' | null) => void
}) {
  const { t } = useI18n()
  const st = snap.eqById[instanceId]
  const bands = st?.bands ?? []
  const activeIndex = bands.findIndex((item) => item.type !== 'off')
  const selected =
    selection && selection.instanceId === instanceId && bands[selection.index] && bands[selection.index]?.type !== 'off'
      ? selection.index
      : activeIndex
  const band = selected >= 0 ? bands[selected] : undefined

  useEffect(() => {
    if (!instanceId || selected < 0) return
    if (selection?.instanceId === instanceId && selection.index === selected) return
    selectEqBand({ instanceId, index: selected })
  }, [instanceId, selected, selection])

  if (!band || selected < 0) {
    return (
      <div className={styles.body}>
        <button
          type="button"
          className={styles.more}
          onClick={() => {
            const next = engine.createEqStrip('peaking', instanceId)
            if (next != null) selectEqBand({ instanceId, index: next })
          }}
        >
          {t.mobile.addBand}
        </button>
      </div>
    )
  }

  const typeInfo = EQ_FILTER_TYPES.find((item) => item.value === band.type) ?? EQ_FILTER_TYPES[0]!
  const showGain = bandUsesGain(band.type)
  const activeField: 'freq' | 'gain' | 'q' = field === 'gain' && showGain ? 'gain' : field === 'q' ? 'q' : 'freq'
  const bandColor = eqBandTone(selected, readThemeColors()).curve
  const set = (patch: Parameters<typeof engine.setEqBand>[1]) => engine.setEqBand(selected, patch, instanceId)
  const canAdd = planEqBandInsert(bands) != null && bands.length < EQ_MAX_BANDS

  const freqN = freqToN(band.frequency)
  const gainN = (Math.min(18, Math.max(-18, band.gain)) + 18) / 36
  const qN = qToN(band.q)

  return (
    <div className={styles.body} data-eq-field={activeField}>
      <div className={styles.eqRow} style={{ '--band': bandColor } as CSSProperties}>
        <button type="button" className={styles.eqCell} onClick={() => onTypeOpen(!typeOpen)}>
          <span>{t.mobile.type}</span>
          <strong>{typeInfo.short}</strong>
        </button>
        <button type="button" className={`${styles.eqCell} ${activeField === 'freq' ? styles.eqCellOn : ''}`} onClick={() => onField('freq')}>
          <span>{t.mobile.freq}</span>
          <strong>{formatEqHz(band.frequency)}</strong>
        </button>
        {showGain ? (
          <button type="button" className={`${styles.eqCell} ${activeField === 'gain' ? styles.eqCellOn : ''}`} onClick={() => onField('gain')}>
            <span>{t.mobile.gain}</span>
            <strong>
              {band.gain >= 0 ? '+' : ''}
              {band.gain.toFixed(1)}
            </strong>
          </button>
        ) : null}
        <button type="button" className={`${styles.eqCell} ${activeField === 'q' ? styles.eqCellOn : ''}`} onClick={() => onField('q')}>
          <span>{t.mobile.q}</span>
          <strong>{band.q.toFixed(2)}</strong>
        </button>
        <button
          type="button"
          className={styles.eqAdd}
          aria-label={t.mobile.addBand}
          disabled={!canAdd}
          onClick={() => {
            const next = engine.createEqStrip('peaking', instanceId)
            if (next != null) selectEqBand({ instanceId, index: next })
          }}
        >
          +
        </button>
      </div>
      {typeOpen ? (
        <div className={styles.typeGrid} role="listbox" aria-label={t.mobile.type}>
          {EQ_FILTER_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === band.type}
              onClick={() => {
                const next = item.value as EqFilterType
                set(
                  (next === 'highpass' || next === 'lowpass') && band.slope < 24
                    ? { type: next, slope: 48 }
                    : { type: next },
                )
                onTypeOpen(false)
              }}
            >
              {item.short}
            </button>
          ))}
        </div>
      ) : null}
      {activeField === 'freq' ? (
        <TouchRange
          label={t.mobile.freq}
          valueText={formatEqHz(band.frequency)}
          normalized={freqN}
          min={EQ_MIN_HZ}
          max={EQ_MAX_HZ}
          now={band.frequency}
          paramId={eqModulationParamId(selected, 'freq') ?? undefined}
          onChange={(n) => set({ frequency: nToFreq(n) })}
        />
      ) : null}
      {activeField === 'gain' && showGain ? (
        <TouchRange
          label={t.mobile.gain}
          valueText={`${band.gain.toFixed(1)} dB`}
          normalized={gainN}
          min={-18}
          max={18}
          now={band.gain}
          paramId={eqModulationParamId(selected, 'gain') ?? undefined}
          onChange={(n) => set({ gain: n * 36 - 18 })}
        />
      ) : null}
      {activeField === 'q' ? (
        <TouchRange
          label={t.mobile.q}
          valueText={band.q.toFixed(2)}
          normalized={qN}
          min={0.1}
          max={20}
          now={band.q}
          paramId={eqModulationParamId(selected, 'q') ?? undefined}
          onChange={(n) => set({ q: nToQ(n) })}
        />
      ) : null}
    </div>
  )
}

function freqToN(hz: number): number {
  const min = Math.log(EQ_MIN_HZ)
  const max = Math.log(EQ_MAX_HZ)
  return (Math.log(Math.min(EQ_MAX_HZ, Math.max(EQ_MIN_HZ, hz))) - min) / (max - min)
}

function nToFreq(n: number): number {
  return EQ_MIN_HZ * (EQ_MAX_HZ / EQ_MIN_HZ) ** Math.min(1, Math.max(0, n))
}

function qToN(q: number): number {
  const min = Math.log(0.1)
  const max = Math.log(20)
  return (Math.log(Math.min(20, Math.max(0.1, q))) - min) / (max - min)
}

function nToQ(n: number): number {
  return 0.1 * (20 / 0.1) ** Math.min(1, Math.max(0, n))
}
