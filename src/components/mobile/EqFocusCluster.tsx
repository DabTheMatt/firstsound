import { useEffect, useState, type CSSProperties } from 'react'
import { EQ_FILTER_TYPES, EQ_MAX_BANDS, EQ_MAX_HZ, EQ_MIN_HZ, planEqBandInsert, slopeFromNormalized, slopeToNormalized, nearestFilterSlope, type EqFilterType } from '../../audio/engine/eqBands'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { eqBandLfoIds, fxLfoIsActive, lfoBinding, lfoDrivesInstance, lfoRangeNormalized } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { LfoParamShell, ModulationScopeProvider } from '../controls/LfoParamShell'
import { eqBandTone, readThemeColors } from '../../theme'
import { ValueKnob } from '../controls/ValueKnob'
import { focusEqTypePatch } from './eqFocusGesture'
import { focusEqKnobs, focusEqTypeOptions, type FocusEqKnob } from './eqFocusControls'
import { focusEqTypeLabel, formatFocusDb, formatFocusHz, formatFocusQValue, formatFocusSlope } from './focusReadout'
import { EffectRandomMenu } from '../random/EffectRandomMenu'
import styles from './FocusChrome.module.css'

type Props = {
  onSelectModule: (instanceId: string) => void
}

export function EqFocusCluster({ onSelectModule }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const [selected, setSelected] = useState<EqBandSelection | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => subscribeEqBandSelection(setSelected), [])

  const eq =
    snap.chain.find((mod) => mod.instanceId === selected?.instanceId && mod.type === 'eq') ??
    snap.chain.find((mod) => mod.type === 'eq')
  const bands = eq ? (snap.eqById[eq.instanceId]?.bands ?? []) : []
  const index = eq && selected?.instanceId === eq.instanceId ? selected.index : -1
  const band = index >= 0 ? bands[index] : undefined
  const active = band && band.type !== 'off' ? band : null
  const canAdd = !eq || (bands.length < EQ_MAX_BANDS && planEqBandInsert(bands) != null)
  const shared = eq ? eqInstanceUsesSharedLfo(snap.chain, eq.instanceId) : false
  const ids = index >= 0 ? eqBandLfoIds(index) : null
  const knobs = active ? focusEqKnobs(active.type) : []
  const live = eq && snap.liveByInstance[eq.instanceId] ? snap.liveByInstance[eq.instanceId] : snap.liveParams
  const accent = index >= 0 ? eqBandTone(index, readThemeColors()).curve : undefined
  const listed = bands.filter((item) => item.type !== 'off')

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

  const setType = (type: EqFilterType) => {
    if (!eq || !active) return
    engine.setEqBand(index, focusEqTypePatch(active, type), eq.instanceId)
  }

  const selectRow = (row: number) => {
    if (!eq) return
    selectEqBand({ instanceId: eq.instanceId, index: row })
    setFiltersOpen(false)
  }

  return (
    <div className={styles.eqCluster} data-eq-focus-controls="">
      <div className={styles.eqLayout}>
        <div className={styles.filterColumn}>
          <div className={styles.filterBar}>
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {t.focus.filters}
            </button>
            {active ? (
              <span className={styles.eqName}>
                {t.focus.band(index + 1, focusEqTypeLabel(active.type))} · {formatFocusHz(active.frequency)}
              </span>
            ) : null}
          </div>
          <ul className={styles.filterList} data-open={filtersOpen ? 'true' : 'false'} aria-label={t.focus.filters}>
            <li className={styles.filterHead}>{t.focus.filters}</li>
            {listed.map((item) => {
              const row = bands.indexOf(item)
              const on = row === index
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={on ? styles.filterOn : styles.filterRow}
                    aria-pressed={on}
                    onClick={() => selectRow(row)}
                  >
                    <i style={{ background: eqBandTone(row, readThemeColors()).curve }} />
                    <span>EQ {row + 1}</span>
                    <span>{formatFocusHz(item.frequency)}</span>
                    <span>{focusEqTypeLabel(item.type)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className={styles.eqWell}>
      <div className={styles.eqHead}>
        <button
          type="button"
          className={styles.hit}
          aria-label={t.mobile.addBand}
          title={t.mobile.addBand}
          disabled={!canAdd}
          onClick={addBand}
        >
          +
        </button>
        {active ? (
          <span className={styles.eqName}>{t.focus.band(index + 1, focusEqTypeLabel(active.type))}</span>
        ) : null}
        <EffectRandomMenu type="eq" />
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
      {eq && active ? (
        <div className={styles.eqKnobs}>
          {knobs.map((field) => {
            if (field === 'freq') {
              return (
                <EqKnob
                  key={field}
                  field={field}
                  label={t.mobile.freq}
                  valueText={formatFocusHz(liveHz(live, ids?.freq, active.frequency))}
                  baseValueText={ids && drives(snap, ids.freq, eq?.instanceId, shared, active.id) ? formatFocusHz(active.frequency) : undefined}
                  normalized={toNormalized(active.frequency, PARAMS.eq1Freq)}
                  visualNormalized={ids && drives(snap, ids.freq, eq?.instanceId, shared, active.id) ? toNormalized(live[ids.freq] ?? active.frequency, PARAMS.eq1Freq) : undefined}
                  lfoRange={ids && drives(snap, ids.freq, eq?.instanceId, shared, active.id) ? lfoRangeFor(snap, ids.freq, toNormalized(active.frequency, PARAMS.eq1Freq)) : undefined}
                  accent={accent}
                  instanceId={eq?.instanceId}
                  bandId={active.id}
                  includeUnscoped={shared}
                  min={EQ_MIN_HZ}
                  max={EQ_MAX_HZ}
                  now={active.frequency}
                  paramId={ids?.freq}
                  afford
                  onChange={(n) => engine.setEqBand(index, { frequency: fromNormalized(n, PARAMS.eq1Freq) }, eq.instanceId)}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, EQ_MIN_HZ, EQ_MAX_HZ, 'Hz')
                    if (next == null) return false
                    engine.setEqBand(index, { frequency: next }, eq.instanceId)
                    return true
                  }}
                />
              )
            }
            if (field === 'gain') {
              return (
                <EqKnob
                  key={field}
                  field={field}
                  label={t.mobile.gain}
                  valueText={formatFocusDb(liveNum(live, ids?.gain, active.gain))}
                  baseValueText={ids && drives(snap, ids.gain, eq?.instanceId, shared, active.id) ? formatFocusDb(active.gain) : undefined}
                  normalized={toNormalized(active.gain, PARAMS.eq1Gain)}
                  visualNormalized={ids && drives(snap, ids.gain, eq?.instanceId, shared, active.id) ? toNormalized(live[ids.gain] ?? active.gain, PARAMS.eq1Gain) : undefined}
                  lfoRange={ids && drives(snap, ids.gain, eq?.instanceId, shared, active.id) ? lfoRangeFor(snap, ids.gain, toNormalized(active.gain, PARAMS.eq1Gain)) : undefined}
                  accent={accent}
                  instanceId={eq?.instanceId}
                  bandId={active.id}
                  includeUnscoped={shared}
                  min={PARAMS.eq1Gain.min}
                  max={PARAMS.eq1Gain.max}
                  now={active.gain}
                  paramId={ids?.gain}
                  afford
                  onChange={(n) => engine.setEqBand(index, { gain: fromNormalized(n, PARAMS.eq1Gain) }, eq.instanceId)}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, PARAMS.eq1Gain.min, PARAMS.eq1Gain.max, 'dB')
                    if (next == null) return false
                    engine.setEqBand(index, { gain: next }, eq.instanceId)
                    return true
                  }}
                />
              )
            }
            if (field === 'q') {
              return (
                <EqKnob
                  key={field}
                  field={field}
                  label={t.mobile.q}
                  valueText={formatFocusQValue(liveNum(live, ids?.q, active.q))}
                  baseValueText={ids && drives(snap, ids.q, eq?.instanceId, shared, active.id) ? formatFocusQValue(active.q) : undefined}
                  normalized={toNormalized(active.q, PARAMS.eq1Q)}
                  visualNormalized={ids && drives(snap, ids.q, eq?.instanceId, shared, active.id) ? toNormalized(live[ids.q] ?? active.q, PARAMS.eq1Q) : undefined}
                  lfoRange={ids && drives(snap, ids.q, eq?.instanceId, shared, active.id) ? lfoRangeFor(snap, ids.q, toNormalized(active.q, PARAMS.eq1Q)) : undefined}
                  accent={accent}
                  instanceId={eq?.instanceId}
                  bandId={active.id}
                  includeUnscoped={shared}
                  min={PARAMS.eq1Q.min}
                  max={PARAMS.eq1Q.max}
                  now={active.q}
                  paramId={ids?.q}
                  afford
                  onChange={(n) => engine.setEqBand(index, { q: fromNormalized(n, PARAMS.eq1Q) }, eq.instanceId)}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, PARAMS.eq1Q.min, PARAMS.eq1Q.max)
                    if (next == null) return false
                    engine.setEqBand(index, { q: next }, eq.instanceId)
                    return true
                  }}
                />
              )
            }
            return (
              <EqKnob
                key={field}
                field={field}
                label={t.mobile.slope}
                valueText={formatFocusSlope(active.slope)}
                normalized={slopeToNormalized(active.slope)}
                min={12}
                max={96}
                now={active.slope}
                onChange={(n) => engine.setEqBand(index, { slope: slopeFromNormalized(n) }, eq.instanceId)}
                onTypedValue={(text) => {
                  const next = parseTypedRange(text, 12, 96, 'dB')
                  if (next == null) return false
                  engine.setEqBand(index, { slope: nearestFilterSlope(next) }, eq.instanceId)
                  return true
                }}
              />
            )
          })}
          <label className={styles.typeField}>
            <span>{t.mobile.type}</span>
            <select
              data-eq-type=""
              aria-label={t.mobile.type}
              value={active.type}
              onChange={(event) => {
                setType(event.target.value as EqFilterType)
                event.currentTarget.blur()
              }}
            >
              {focusEqTypeOptions().map((value) => (
                <option key={value} value={value}>
                  {EQ_FILTER_TYPES.find((item) => item.value === value)?.short ?? value}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  )
}

function EqKnob({
  field,
  label,
  valueText,
  baseValueText,
  normalized,
  visualNormalized,
  lfoRange,
  min,
  max,
  now,
  paramId,
  afford = false,
  accent,
  instanceId,
  bandId,
  includeUnscoped = true,
  onChange,
  onTypedValue,
}: {
  field: FocusEqKnob
  label: string
  valueText: string
  baseValueText?: string
  normalized: number
  visualNormalized?: number
  lfoRange?: { min: number; max: number }
  min: number
  max: number
  now: number
  paramId?: ParamId
  afford?: boolean
  accent?: string
  instanceId?: string
  bandId?: string
  includeUnscoped?: boolean
  onChange: (normalized: number) => void
  onTypedValue: (text: string) => boolean
}) {
  const knob = (
    <ValueKnob
      compact
      focus
      label={label}
      valueText={valueText}
      baseValueText={baseValueText}
      normalized={normalized}
      visualNormalized={visualNormalized}
      lfoRange={lfoRange}
      min={min}
      max={max}
      now={now}
      onChange={onChange}
      onTypedValue={onTypedValue}
    />
  )
  return (
    <div className={styles.eqKnob} data-eq-knob={field} style={{ '--knob-arc': accent } as CSSProperties}>
      {paramId ? (
        <ModulationScopeProvider instanceId={instanceId} bandId={bandId} includeUnscoped={includeUnscoped}>
          <LfoParamShell id={paramId} afford={afford}>
            {knob}
          </LfoParamShell>
        </ModulationScopeProvider>
      ) : (
        knob
      )}
    </div>
  )
}

function drives(
  snap: EngineSnapshot,
  id: ParamId,
  instanceId: string | undefined,
  includeUnscoped: boolean,
  bandId: string | undefined,
): boolean {
  const binding = lfoBinding(snap.fxLfos, id)
  if (!binding || !fxLfoIsActive(binding.lfo)) return false
  if (binding.lfo.bandId && binding.lfo.bandId !== bandId) return false
  return lfoDrivesInstance(binding.lfo, instanceId, includeUnscoped)
}

function liveNum(live: Record<ParamId, number>, id: ParamId | undefined, fallback: number): number {
  if (!id) return fallback
  const value = live[id]
  return value != null && Number.isFinite(value) ? value : fallback
}

function liveHz(live: Record<ParamId, number>, id: ParamId | undefined, fallback: number): number {
  return liveNum(live, id, fallback)
}

function lfoRangeFor(snap: EngineSnapshot, id: ParamId, baseN: number) {
  const binding = lfoBinding(snap.fxLfos, id)
  if (!binding || !fxLfoIsActive(binding.lfo)) return undefined
  return lfoRangeNormalized(baseN, binding.lfo.depth)
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.2 4.5h9.6M6.2 4.5V3.2h3.6v1.3M4.4 4.5l.6 8.2h6l.6-8.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
