import { useEffect, useId, useRef, useState } from 'react'
import { announce } from '../../a11y/liveRegion'
import { useA11ySettings } from '../../a11y/useA11ySettings'
import { EQ_FILTER_TYPES, FILTER_SLOPES, bandUsesGain, bandUsesSlope, type EqBand, type EqFilterType } from '../../audio/engine/eqBands'
import { selectEqBand } from '../../audio/engine/eqBandSelection'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatAccessibleValue } from '../../a11y/valueText'
import { captureDsp } from '../../sensory/applySensory'
import type { DspSnapshot } from '../../sensory/mapping/mappingEngine'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { AssistedParameterEditor } from './AssistedParameterEditor'
import { indexOfBandId } from './edits'
import styles from './DragFree.module.css'

type Props = {
  onDspGesture: (before: DspSnapshot, after: DspSnapshot) => void
}

type Pick = { instanceId: string; bandId: string }

export function DragFreeEq({ onDspGesture }: Props) {
  const { settings } = useA11ySettings()
  if (!settings.dragFreeEditing) return null
  return <EqBody onDspGesture={onDspGesture} />
}

function EqBody({ onDspGesture }: Props) {
  const { t, locale } = useI18n()
  const snap = useEngine()
  const copy = t.dragFree
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Pick | null>(null)
  const [missing, setMissing] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const firstRef = useRef<HTMLButtonElement | null>(null)
  const eqs = snap.chain.filter((mod) => mod.type === 'eq')
  const primaryId = eqs[0]?.instanceId ?? ''

  useEffect(() => {
    if (open) firstRef.current?.focus()
  }, [open])

  const bandsOf = (instanceId: string) => snap.eqById[instanceId]?.bands ?? []

  const chosen = (() => {
    if (!picked) return null
    const bands = bandsOf(picked.instanceId)
    const index = indexOfBandId(bands, picked.bandId)
    const band = index >= 0 ? bands[index] : undefined
    if (!band) return null
    return { ...picked, index, band }
  })()

  const edit = (patch: Partial<EqBand>) => {
    if (!picked) return
    const live = engine.getSnapshot()
    const bands = live.eqById[picked.instanceId]?.bands ?? []
    const index = indexOfBandId(bands, picked.bandId)
    if (index < 0) {
      setMissing(true)
      setPicked(null)
      return
    }
    const before = captureDsp(engine)
    engine.setEqBand(index, patch, picked.instanceId)
    const after = engine.getSnapshot().eqById[picked.instanceId]?.bands?.[index]
    // Activating an empty slot mints a new band id. Follow that slot, not a neighbor.
    if (!after?.id) {
      setMissing(true)
      setPicked(null)
      return
    }
    if (after.id !== picked.bandId) setPicked({ instanceId: picked.instanceId, bandId: after.id })
    if (picked.instanceId === primaryId) onDspGesture(before, captureDsp(engine))
    setMissing(false)
    announce(copy.appliedBand)
  }

  const choose = (instanceId: string, band: EqBand, index: number) => {
    if (!band.id) return
    setPicked({ instanceId, bandId: band.id })
    setMissing(false)
    selectEqBand({ instanceId, index })
  }

  return (
    <section className={styles.panel} aria-labelledby={titleId} data-drag-free="eq">
      <h2 id={titleId} className={styles.note}>
        {copy.eqBands}
      </h2>
      {eqs.length === 0 ? <p className={styles.note}>{copy.noEq}</p> : null}
      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        disabled={eqs.length === 0}
        onClick={(event) => {
          triggerRef.current = event.currentTarget
          setOpen((value) => {
            if (value) triggerRef.current?.focus()
            return !value
          })
        }}
      >
        {copy.editBand}
      </button>
      {open ? (
        <ul className={styles.list}>
          {eqs.flatMap((mod, eqIndex) => {
            const bands = bandsOf(mod.instanceId).flatMap((band, index) => (!band.id ? [] : [{ band, index }]))
            if (bands.length === 0) {
              return [
                <li key={mod.instanceId}>
                  <p className={styles.note}>{copy.noBands}</p>
                </li>,
              ]
            }
            return bands.map(({ band, index }) => {
              const typeLabel = EQ_FILTER_TYPES.find((item) => item.value === band.type)?.label ?? band.type
              const number = index + 1
              const selected = picked != null && picked.bandId === band.id && picked.instanceId === mod.instanceId
              return (
                <li key={band.id}>
                  <button
                    ref={eqIndex === 0 && index === 0 ? firstRef : undefined}
                    type="button"
                    className={styles.button}
                    aria-pressed={selected}
                    aria-label={copy.bandSr(number, typeLabel)}
                    onClick={() => choose(mod.instanceId, band, index)}
                  >
                    {eqs.length > 1 ? `EQ ${eqIndex + 1} · ` : ''}
                    {copy.bandSr(number, typeLabel).replace(/\.$/, '')}
                  </button>
                </li>
              )
            })
          })}
        </ul>
      ) : null}
      {missing ? (
        <p className={styles.error} role="alert">
          {copy.noBands}
        </p>
      ) : null}
      {open && chosen ? (
        <BandEditor band={chosen.band} number={chosen.index + 1} locale={locale} onEdit={edit} />
      ) : null}
    </section>
  )
}

function BandEditor({
  band,
  number,
  locale,
  onEdit,
}: {
  band: EqBand
  number: number
  locale: 'en' | 'pl'
  onEdit: (patch: Partial<EqBand>) => void
}) {
  const { t } = useI18n()
  const copy = t.dragFree
  const typeLabel = EQ_FILTER_TYPES.find((item) => item.value === band.type)?.label ?? band.type
  const gain = bandUsesGain(band.type)
  const slope = bandUsesSlope(band.type)
  return (
    <div className={styles.form}>
      <AssistedParameterEditor
        label={copy.frequency}
        def={PARAMS.eq1Freq}
        value={band.frequency}
        spoken={copy.freqSr(number, formatAccessibleValue(band.frequency, PARAMS.eq1Freq, locale))}
        onApply={(frequency) => onEdit({ frequency })}
      />
      {gain ? (
        <AssistedParameterEditor
          label={copy.gain}
          def={PARAMS.eq1Gain}
          value={band.gain}
          spoken={formatAccessibleValue(band.gain, PARAMS.eq1Gain, locale)}
          onApply={(next) => onEdit({ gain: next })}
        />
      ) : null}
      <AssistedParameterEditor
        label={copy.q}
        def={PARAMS.eq1Q}
        value={band.q}
        spoken={formatAccessibleValue(band.q, PARAMS.eq1Q, locale)}
        onApply={(q) => onEdit({ q })}
      />
      {slope ? (
        <label className={styles.field}>
          <span>Slope</span>
          <select
            value={String(band.slope)}
            aria-label={`${typeLabel}, slope, ${band.slope}`}
            onChange={(event) => {
              const next = FILTER_SLOPES.find((item) => item.value === Number(event.target.value))
              if (next) onEdit({ slope: next.value })
            }}
          >
            {FILTER_SLOPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className={styles.field}>
        <span>{copy.filterType}</span>
        <select
          value={band.type === 'off' ? '' : band.type}
          aria-label={`${copy.bandSr(number, typeLabel)} ${copy.filterType}`}
          onChange={(event) => {
            const next = event.target.value
            if (!next || next === 'off') return
            onEdit({ type: next as EqFilterType })
          }}
        >
          {band.type === 'off' ? <option value="">{copy.chooseType}</option> : null}
          {EQ_FILTER_TYPES.filter((item) => item.value !== 'off').map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {band.type !== 'off' ? (
        <button
          type="button"
          className={styles.button}
          aria-pressed={Boolean(band.bypassed)}
          onClick={() => onEdit({ bypassed: !band.bypassed })}
        >
          {band.bypassed ? copy.enable : copy.bypass}
        </button>
      ) : null}
    </div>
  )
}
