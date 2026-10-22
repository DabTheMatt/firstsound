import { useEffect, useState } from 'react'
import { EQ_FILTER_TYPES, EQ_MAX_BANDS, EQ_MAX_HZ, EQ_MIN_HZ, planEqBandInsert, slopeFromNormalized, slopeToNormalized, nearestFilterSlope, type EqFilterType } from '../../audio/engine/eqBands'
import { getEqBandSelection, selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import { eqInstanceUsesSharedLfo } from '../../audio/engine/eqOverlayFocus'
import { eqBandLfoIds, fxLfoIsActive, lfoBinding, lfoDrivesInstance, lfoRangeNormalized } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { fromNormalized, parseTypedRange, toNormalized } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { EngineSnapshot } from '../../audio/engine/AudioEngine'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { LfoParamShell, ModulationScopeProvider } from '../controls/LfoParamShell'
import { loadSpectrumPrefs, subscribeSpectrumPrefs } from '../../audio/engine/spectrumPrefs'
import { listedBandColor } from '../eq/eqBandStyle'
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
  const [selected, setSelected] = useState<EqBandSelection | null>(() => getEqBandSelection())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [freqColors, setFreqColors] = useState(() => loadSpectrumPrefs().surfaces.eq.eqFreqColors)
  useEffect(() => subscribeEqBandSelection(setSelected), [])
  useEffect(() => subscribeSpectrumPrefs((prefs) => setFreqColors(prefs.surfaces.eq.eqFreqColors)), [])

  const eq =
    snap.chain.find((mod) => mod.instanceId === selected?.instanceId && mod.type === 'eq') ??
    snap.chain.find((mod) => mod.type === 'eq')
  const bands = eq ? (snap.eqById[eq.instanceId]?.bands ?? []) : []
  const index = eq && selected?.instanceId === eq.instanceId ? selected.index : -1
  const band = index >= 0 ? bands[index] : undefined
  const active = band && band.type !== 'off' ? band : null
  const canAdd = !eq || (bands.length < EQ_MAX_BANDS && planEqBandInsert(bands) != null)
  const shared = eq ? eqInstanceUsesSharedLfo(snap.chain, eq.instanceId) : false
  const live = eq && snap.liveByInstance[eq.instanceId] ? snap.liveByInstance[eq.instanceId] : snap.liveParams
  const tone = readThemeColors()
  const accent =
    index >= 0 && active
      ? listedBandColor(active.frequency, eqBandTone(index, tone).curve, freqColors)
      : undefined
  const listed = bands.filter((item) => item.type !== 'off')
  const panelIndex = active ? index : listed[0] ? bands.indexOf(listed[0]) : -1
  const panelBand = panelIndex >= 0 ? bands[panelIndex] : undefined
  const panel = panelBand && panelBand.type !== 'off' ? panelBand : null
  const reveal = useKnobReveal(panel != null)
  const snapshot = eq && panel ? { eqId: eq.instanceId, index: panelIndex, band: panel } : null
  const [frozen, setFrozen] = useState(snapshot)
  if (snapshot && !sameSlide(snapshot, frozen)) setFrozen(snapshot)
  const slide = snapshot ?? (reveal.mounted ? frozen : null)
  const slideIds = slide ? eqBandLfoIds(slide.index) : null
  const slideKnobs = slide ? focusEqKnobs(slide.band.type) : []
  const slideAccent =
    slide ? listedBandColor(slide.band.frequency, eqBandTone(slide.index, tone).curve, freqColors) : undefined

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
              <>
                <span className={styles.eqName} style={{ color: accent }}>
                  {t.focus.bandName(index + 1)}
                </span>
                <span className={styles.eqMeta}>{formatFocusHz(active.frequency)}</span>
              </>
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
                    <i style={{ background: listedBandColor(item.frequency, eqBandTone(row, tone).curve, freqColors) }} />
                    <span className={styles.filterName} style={{ color: listedBandColor(item.frequency, eqBandTone(row, tone).curve, freqColors) }}>
                      EQ {row + 1}
                    </span>
                    <span>{formatFocusHz(item.frequency)}</span>
                    <span>{focusEqTypeLabel(item.type)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className={styles.eqWell} data-eq-well="" data-eq-knobs={reveal.shown ? 'true' : 'false'}>
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
        <EffectRandomMenu type="eq" />
      </div>
      <div className={styles.eqSlide} data-open={reveal.shown ? 'true' : 'false'}>
        <div className={styles.eqSlideInner}>
      {slide ? (
        <>
      <div className={styles.eqHead}>
        <span className={styles.eqName} style={{ color: slideAccent }}>
          {t.focus.bandName(slide.index + 1)}
        </span>
        <label className={styles.typeField}>
          <span className="sr-only">{t.mobile.type}</span>
          <select
            data-eq-type=""
            aria-label={t.mobile.type}
            value={slide.band.type}
            onChange={(event) => {
              engine.setEqBand(slide.index, focusEqTypePatch(slide.band, event.target.value as EqFilterType), slide.eqId)
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
        <button
          type="button"
          className={styles.hit}
          aria-label={t.focus.deleteNode}
          title={t.focus.deleteNode}
          onClick={() => {
            engine.setEqBand(slide.index, { type: 'off' }, slide.eqId)
            const rest = bands.findIndex((item, row) => row !== slide.index && item.type !== 'off')
            selectEqBand(rest >= 0 ? { instanceId: slide.eqId, index: rest } : null)
          }}
        >
          <TrashIcon />
        </button>
      </div>
        <div className={styles.eqKnobs}>
          {slideKnobs.map((field) => {
            if (field === 'freq') {
              return (
                <EqKnob
                  key={field}
                  field={field}
                  label={t.mobile.freq}
                  valueText={formatFocusHz(liveHz(live, slideIds?.freq, slide.band.frequency))}
                  baseValueText={slideIds && drives(snap, slideIds.freq, slide.eqId, shared, slide.band.id) ? formatFocusHz(slide.band.frequency) : undefined}
                  normalized={toNormalized(slide.band.frequency, PARAMS.eq1Freq)}
                  visualNormalized={slideIds && drives(snap, slideIds.freq, slide.eqId, shared, slide.band.id) ? toNormalized(live[slideIds.freq] ?? slide.band.frequency, PARAMS.eq1Freq) : undefined}
                  lfoRange={slideIds && drives(snap, slideIds.freq, slide.eqId, shared, slide.band.id) ? lfoRangeFor(snap, slideIds.freq, toNormalized(slide.band.frequency, PARAMS.eq1Freq)) : undefined}
                  instanceId={slide.eqId}
                  bandId={slide.band.id}
                  includeUnscoped={shared}
                  min={EQ_MIN_HZ}
                  max={EQ_MAX_HZ}
                  now={slide.band.frequency}
                  paramId={slideIds?.freq}
                  afford
                  onChange={(n) => engine.setEqBand(slide.index, { frequency: fromNormalized(n, PARAMS.eq1Freq) }, slide.eqId)}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, EQ_MIN_HZ, EQ_MAX_HZ, 'Hz')
                    if (next == null) return false
                    engine.setEqBand(slide.index, { frequency: next }, slide.eqId)
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
                  valueText={formatFocusDb(liveNum(live, slideIds?.gain, slide.band.gain))}
                  baseValueText={slideIds && drives(snap, slideIds.gain, slide.eqId, shared, slide.band.id) ? formatFocusDb(slide.band.gain) : undefined}
                  normalized={toNormalized(slide.band.gain, PARAMS.eq1Gain)}
                  visualNormalized={slideIds && drives(snap, slideIds.gain, slide.eqId, shared, slide.band.id) ? toNormalized(live[slideIds.gain] ?? slide.band.gain, PARAMS.eq1Gain) : undefined}
                  lfoRange={slideIds && drives(snap, slideIds.gain, slide.eqId, shared, slide.band.id) ? lfoRangeFor(snap, slideIds.gain, toNormalized(slide.band.gain, PARAMS.eq1Gain)) : undefined}
                  instanceId={slide.eqId}
                  bandId={slide.band.id}
                  includeUnscoped={shared}
                  min={PARAMS.eq1Gain.min}
                  max={PARAMS.eq1Gain.max}
                  now={slide.band.gain}
                  paramId={slideIds?.gain}
                  afford
                  onChange={(n) => engine.setEqBand(slide.index, { gain: fromNormalized(n, PARAMS.eq1Gain) }, slide.eqId)}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, PARAMS.eq1Gain.min, PARAMS.eq1Gain.max, 'dB')
                    if (next == null) return false
                    engine.setEqBand(slide.index, { gain: next }, slide.eqId)
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
                  valueText={formatFocusQValue(liveNum(live, slideIds?.q, slide.band.q))}
                  baseValueText={slideIds && drives(snap, slideIds.q, slide.eqId, shared, slide.band.id) ? formatFocusQValue(slide.band.q) : undefined}
                  normalized={toNormalized(slide.band.q, PARAMS.eq1Q)}
                  visualNormalized={slideIds && drives(snap, slideIds.q, slide.eqId, shared, slide.band.id) ? toNormalized(live[slideIds.q] ?? slide.band.q, PARAMS.eq1Q) : undefined}
                  lfoRange={slideIds && drives(snap, slideIds.q, slide.eqId, shared, slide.band.id) ? lfoRangeFor(snap, slideIds.q, toNormalized(slide.band.q, PARAMS.eq1Q)) : undefined}
                  instanceId={slide.eqId}
                  bandId={slide.band.id}
                  includeUnscoped={shared}
                  min={PARAMS.eq1Q.min}
                  max={PARAMS.eq1Q.max}
                  now={slide.band.q}
                  paramId={slideIds?.q}
                  afford
                  onChange={(n) => engine.setEqBand(slide.index, { q: fromNormalized(n, PARAMS.eq1Q) }, slide.eqId)}
                  onTypedValue={(text) => {
                    const next = parseTypedRange(text, PARAMS.eq1Q.min, PARAMS.eq1Q.max)
                    if (next == null) return false
                    engine.setEqBand(slide.index, { q: next }, slide.eqId)
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
                valueText={formatFocusSlope(slide.band.slope)}
                normalized={slopeToNormalized(slide.band.slope)}
                min={12}
                max={96}
                now={slide.band.slope}
                onChange={(n) => engine.setEqBand(slide.index, { slope: slopeFromNormalized(n) }, slide.eqId)}
                onTypedValue={(text) => {
                  const next = parseTypedRange(text, 12, 96, 'dB')
                  if (next == null) return false
                  engine.setEqBand(slide.index, { slope: nearestFilterSlope(next) }, slide.eqId)
                  return true
                }}
              />
            )
          })}
        </div>
        </>
      ) : null}
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

const KNOB_SLIDE_MS = 340

function motionReduced(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reducedMotion === 'true'
}

type SlideSnap = { eqId: string; index: number; band: { id?: string; type: string; frequency: number; gain: number; q: number; slope: number } }

function sameSlide(a: SlideSnap | null, b: SlideSnap | null): boolean {
  if (!a || !b) return false
  return (
    a.eqId === b.eqId &&
    a.index === b.index &&
    a.band.id === b.band.id &&
    a.band.type === b.band.type &&
    a.band.frequency === b.band.frequency &&
    a.band.gain === b.band.gain &&
    a.band.q === b.band.q &&
    a.band.slope === b.band.slope
  )
}

/** Keep the knob panel mounted for the slide, then drop it after the last filter leaves. */
function useKnobReveal(open: boolean): { mounted: boolean; shown: boolean } {
  const reduce = motionReduced()
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)
  if (reduce) {
    if (mounted !== open) setMounted(open)
    if (shown !== open) setShown(open)
  } else {
    if (open && !mounted) setMounted(true)
    if (!open && shown) setShown(false)
  }
  useEffect(() => {
    if (reduce || !open) return
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [open, reduce])
  useEffect(() => {
    if (reduce || open || !mounted) return
    const timer = window.setTimeout(() => setMounted(false), KNOB_SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [open, reduce, mounted])
  return { mounted, shown }
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
    <div className={styles.eqKnob} data-eq-knob={field}>
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
