import { useId, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ModuleType } from '../../audio/chain/chain'
import { getEqBandSelection } from '../../audio/engine/eqBandSelection'
import { bandUsesGain, bandUsesSlope, type EqFilterType } from '../../audio/engine/eqBands'
import { EQ_BAND_LFO_IDS, FX_LFO_KIND_LABELS } from '../../audio/fx/lfo'
import { withRandomHistory } from '../../audio/random/historyBridge'
import { catalogFor, catalogLabel, participatingRefs, type RandomCatalogEntry } from '../../audio/random/catalog'
import { reverbRandomSetupLabel } from '../../audio/random/reverbRandom'
import { moduleRandomKind, participatingTargets } from '../../audio/random/groups'
import { defaultParamRandom, type EqBandRandomField, type EqRandomCount, type ParamRandom } from '../../audio/random/types'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { DiceIcon, GearIcon } from './icons'
import { ParamRandomFields } from './ParamRandomFields'
import { RandomLayer } from './RandomLayer'
import styles from './Random.module.css'

type Props = {
  type: ModuleType
}

const COUNTS: EqRandomCount[] = [1, 2, 3, 4, 5, 6, 'random']

export function EffectRandomMenu({ type }: Props) {
  const snap = useEngine()
  const { t, paramLabel } = useI18n()
  const kind = moduleRandomKind(type)
  const eq = type === 'eq'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  if (!eq && !kind) return null
  const title = eq ? 'EQ' : kind ? FX_LFO_KIND_LABELS[kind] : ''

  const randomizeNow = () => {
    withRandomHistory(() => {
      if (eq) {
        if (snap.random.eq.scope === 'band') {
          const index = getEqBandSelection()?.index ?? snap.random.eqPick?.index ?? 0
          engine.randomizeEqBand(index, true)
        } else engine.generateRandomEq()
        return
      }
      if (kind) engine.randomizeEffect(kind)
    })
  }

  return (
    <div ref={rootRef} className={styles.pair} data-random-pair="effect">
      <button
        type="button"
        className={styles.dice}
        data-random-action="dice"
        aria-label={eq ? t.random.randomizeEq : t.random.effectAria(title)}
        title={eq ? t.random.randomizeEq : t.random.randomizeEffect}
        onClick={(event) => {
          event.stopPropagation()
          randomizeNow()
        }}
      >
        <DiceIcon />
      </button>
      <button
        type="button"
        className={styles.gear}
        data-random-action="setup"
        data-open={open ? 'true' : 'false'}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.random.setupAria}
        title={t.random.setup}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <GearIcon />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <RandomLayer anchorRef={rootRef} label={t.random.setup} title={t.random.title(title)} onClose={() => setOpen(false)} footer={
              eq ? <EqFooter onNow={randomizeNow} onClose={() => setOpen(false)} /> : kind ? <EffectFooter kind={kind} onNow={() => { randomizeNow(); setOpen(false) }} /> : null
            }>
              {eq ? <EqSetup /> : kind ? <EffectSetup kind={kind} paramLabel={paramLabel} /> : null}
            </RandomLayer>,
            document.body,
          )
        : null}
    </div>
  )
}

function EffectSetup({ kind, paramLabel }: { kind: NonNullable<ReturnType<typeof moduleRandomKind>>; paramLabel: (id: ParamId) => string }) {
  const snap = useEngine()
  const { t } = useI18n()
  const entries = catalogFor(kind)
  const selected = participatingRefs(snap.random, kind)
  const parameters = entries.filter((entry) => entry.group === 'parameter')
  const selects = entries.filter((entry) => entry.group === 'select')
  const selectedIds = participatingTargets(snap.random, kind)
  const shared = selectedIds[0] ? snap.random.generators[selectedIds[0]] ?? defaultParamRandom() : defaultParamRandom()
  const toggle = (entry: RandomCatalogEntry) => {
    const on = selected.includes(entry.ref)
    const next = on ? selected.filter((item) => item !== entry.ref) : [...selected, entry.ref]
    engine.setRandomParticipation(kind, next)
  }
  return (
    <>
      <Group title={t.random.parameters} entries={parameters} selected={selected} labelOf={(entry) => {
        if (kind === 'reverb' && entry.paramId) {
          const mix = reverbRandomSetupLabel(entry.paramId)
          if (mix) return mix
        }
        return entry.paramId ? paramLabel(entry.paramId) : catalogLabel(entry)
      }} onToggle={toggle} onAll={() => engine.setRandomParticipation(kind, entries.map((entry) => entry.ref))} onNone={() => engine.setRandomParticipation(kind, [])} allLabel={t.random.all} noneLabel={t.random.none} />
      {selects.length > 0 ? (
        <Group title={t.random.selects} entries={selects} selected={selected} labelOf={(entry) => selectLabel(entry, t.random)} onToggle={toggle} />
      ) : null}
      {selectedIds.length > 0 ? (
        <BehaviorRow
          gen={shared}
          onPatch={(patch) => {
            for (const id of selectedIds) engine.setParamRandom(id, patch)
          }}
        />
      ) : null}
    </>
  )
}

function TargetRow({
  entry,
  label,
  checked,
  onToggle,
}: {
  entry: RandomCatalogEntry
  label: string
  checked: boolean
  onToggle: () => void
}) {
  const snap = useEngine()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const paramId = entry.paramId ?? null
  const gen = paramId ? snap.random.generators[paramId] ?? defaultParamRandom() : null
  return (
    <div className={styles.targetBlock} data-open={open ? 'true' : 'false'}>
      <div className={styles.target}>
        <label className={styles.check}>
          <input type="checkbox" checked={checked} aria-label={label} onChange={onToggle} />
          {paramId ? null : (
            <span>
              {label}
              {entry.auto ? null : <em>1×</em>}
            </span>
          )}
        </label>
        {paramId ? (
          <button type="button" className={styles.targetName} onClick={() => setOpen((value) => !value)}>
            {label}
            {entry.auto ? null : <em>1×</em>}
          </button>
        ) : null}
        {paramId ? (
          <button
            type="button"
            className={styles.chevron}
            aria-expanded={open}
            aria-label={open ? t.random.hideTarget(label) : t.random.showTarget(label)}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '˅' : '›'}
          </button>
        ) : null}
      </div>
      {open && paramId && gen ? (
        <div className={styles.detail}>
          <ParamRandomFields
            gen={gen}
            chaos={snap.random.chaos}
            autoId={paramId}
            showAuto={entry.auto}
            showRange
            onPatch={(patch) => engine.setParamRandom(paramId, patch)}
          />
        </div>
      ) : null}
    </div>
  )
}

function selectLabel(entry: RandomCatalogEntry, copy: { direction: string; delayType: string; reverbType: string; distortionType: string }): string {
  if (entry.selectId === 'playbackDirection') return copy.direction
  if (entry.selectId === 'delayType') return copy.delayType
  if (entry.selectId === 'reverbType') return copy.reverbType
  if (entry.selectId === 'distortionType') return copy.distortionType
  return catalogLabel(entry)
}

function Group({
  title,
  entries,
  selected,
  labelOf,
  onToggle,
  onAll,
  onNone,
  allLabel,
  noneLabel,
}: {
  title: string
  entries: RandomCatalogEntry[]
  selected: readonly string[]
  labelOf: (entry: RandomCatalogEntry) => string
  onToggle: (entry: RandomCatalogEntry) => void
  onAll?: () => void
  onNone?: () => void
  allLabel?: string
  noneLabel?: string
}) {
  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h3>{title}</h3>
        {onAll && onNone ? (
          <div className={styles.quick}>
            <button type="button" className={styles.link} onClick={onAll}>{allLabel}</button>
            <button type="button" className={styles.link} onClick={onNone}>{noneLabel}</button>
          </div>
        ) : null}
      </div>
      {entries.map((entry) => (
        <TargetRow
          key={entry.ref}
          entry={entry}
          label={labelOf(entry)}
          checked={selected.includes(entry.ref)}
          onToggle={() => onToggle(entry)}
        />
      ))}
    </section>
  )
}

function EffectFooter({ kind, onNow }: { kind: NonNullable<ReturnType<typeof moduleRandomKind>>; onNow: () => void }) {
  const snap = useEngine()
  const { t } = useI18n()
  const selected = participatingRefs(snap.random, kind)
  const params = catalogFor(kind).filter((entry) => entry.paramId && entry.auto).map((entry) => entry.paramId!)
  const armed = params.length > 0 && params.every((id) => !selected.includes(id) || snap.random.generators[id]?.auto)
  const anySelected = params.some((id) => selected.includes(id))
  return (
    <Footer
      nowLabel={t.random.now}
      onNow={onNow}
      autoLabel={`${t.random.auto} ${armed && anySelected && snap.random.chaos ? t.random.on : t.random.off}`}
      autoOn={Boolean(armed && anySelected && snap.random.chaos)}
      onAuto={() => {
        if (!snap.random.chaos) engine.requestChaos()
        else engine.setEffectAuto(kind, !(armed && anySelected))
      }}
      note={!snap.random.chaos ? t.random.chaosHint : snap.random.budgetLimited ? t.random.budget : null}
    />
  )
}

function EqSetup() {
  const snap = useEngine()
  const { t } = useI18n()
  const eq = snap.random.eq
  const index = getEqBandSelection()?.index ?? snap.random.eqPick?.index ?? 0
  const band = snap.eqBands[index]
  const fields: EqBandRandomField[] = ['frequency', 'gain', 'q', 'type', 'slope']
  const active = eq.bandFields ?? (band ? ['frequency', 'gain', 'q', 'type', 'slope'] : fields)
  return (
    <>
      <div className={styles.row} role="group" aria-label={t.random.scope}>
        <button type="button" className={styles.choice} aria-pressed={eq.scope === 'whole'} onClick={() => engine.setEqRandom({ scope: 'whole' })}>
          {t.random.scopeWhole}
        </button>
        <button type="button" className={styles.choice} aria-pressed={eq.scope === 'band'} onClick={() => engine.setEqRandom({ scope: 'band' })}>
          {t.random.scopeBand}
        </button>
      </div>
      {eq.scope === 'whole' ? (
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h3>{t.random.filterCount}</h3>
          </div>
          <div className={styles.row}>
            {COUNTS.map((count) => (
              <button
                key={String(count)}
                type="button"
                className={styles.choice}
                aria-pressed={eq.count === count}
                onClick={() => engine.setEqRandom({ count })}
              >
                {count === 'random' ? t.random.countRandom : count}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h3>{t.random.parameters}</h3>
          </div>
          {fields.filter((field) => fieldVisible(field, band?.type)).map((field) => {
            const paramId = bandParamId(index, field)
            return (
              <FieldRow
                key={field}
                label={fieldLabel(field, t.random)}
                checked={active.includes(field)}
                paramId={paramId}
                onToggle={() => {
                  const on = active.includes(field)
                  const next = on ? active.filter((item) => item !== field) : [...active, field]
                  engine.setEqRandom({ bandFields: next })
                }}
              />
            )
          })}
        </section>
      )}
      <BehaviorRow
        gen={eq.gen}
        onPatch={(patch) => engine.setEqRandom({ gen: { ...eq.gen, ...patch } })}
      />
    </>
  )
}

function bandParamId(index: number, field: EqBandRandomField): ParamId | null {
  const ids = EQ_BAND_LFO_IDS[index]
  if (!ids) return null
  if (field === 'frequency') return ids.freq
  if (field === 'gain') return ids.gain
  if (field === 'q') return ids.q
  return null
}

function FieldRow({
  label,
  checked,
  paramId,
  onToggle,
}: {
  label: string
  checked: boolean
  paramId: ParamId | null
  onToggle: () => void
}) {
  const snap = useEngine()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const gen = paramId ? snap.random.generators[paramId] ?? defaultParamRandom() : null
  return (
    <div className={styles.targetBlock} data-open={open ? 'true' : 'false'}>
      <div className={styles.target}>
        <label className={styles.check}>
          <input type="checkbox" checked={checked} aria-label={label} onChange={onToggle} />
        </label>
        <button type="button" className={styles.targetName} onClick={() => paramId && setOpen((value) => !value)}>
          {label}
        </button>
        {paramId ? (
          <button
            type="button"
            className={styles.chevron}
            aria-expanded={open}
            aria-label={open ? t.random.hideTarget(label) : t.random.showTarget(label)}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '˅' : '›'}
          </button>
        ) : null}
      </div>
      {open && paramId && gen ? (
        <div className={styles.detail}>
          <ParamRandomFields
            gen={gen}
            chaos={snap.random.chaos}
            autoId={paramId}
            showAuto
            showRange
            onPatch={(patch) => engine.setParamRandom(paramId, patch)}
          />
        </div>
      ) : null}
    </div>
  )
}

function BehaviorRow({ gen, onPatch }: { gen: ParamRandom; onPatch: (patch: Partial<ParamRandom>) => void }) {
  const snap = useEngine()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <section className={styles.group}>
      <div className={styles.target}>
        <button type="button" className={styles.targetName} onClick={() => setOpen((value) => !value)}>
          {t.random.behavior}
        </button>
        <button
          type="button"
          className={styles.chevron}
          aria-expanded={open}
          aria-label={open ? t.random.hideTarget(t.random.behavior) : t.random.showTarget(t.random.behavior)}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '˅' : '›'}
        </button>
      </div>
      {open ? (
        <div className={styles.detail}>
          <ParamRandomFields gen={gen} chaos={snap.random.chaos} onPatch={onPatch} />
        </div>
      ) : null}
    </section>
  )
}

function fieldVisible(field: EqBandRandomField, type: EqFilterType | undefined): boolean {
  if (!type || type === 'off') return field === 'type' || field === 'frequency'
  if (field === 'gain') return bandUsesGain(type)
  if (field === 'slope') return bandUsesSlope(type)
  return true
}

function fieldLabel(field: EqBandRandomField, copy: { frequency: string; gain: string; q: string; filterType: string; slope: string }): string {
  if (field === 'frequency') return copy.frequency
  if (field === 'gain') return copy.gain
  if (field === 'q') return copy.q
  if (field === 'type') return copy.filterType
  return copy.slope
}

function EqFooter({ onNow, onClose }: { onNow: () => void; onClose: () => void }) {
  const snap = useEngine()
  const { t } = useI18n()
  const auto = snap.random.eq.auto && snap.random.chaos
  return (
    <Footer
      nowLabel={snap.random.eq.scope === 'whole' ? t.random.wholeEq : t.random.now}
      onNow={() => {
        onNow()
        onClose()
      }}
      autoLabel={`${t.random.auto} ${auto ? t.random.on : t.random.off}`}
      autoOn={auto}
      onAuto={() => engine.armEqAuto()}
      note={!snap.random.chaos ? t.random.chaosHint : t.random.oneShot}
    />
  )
}

function Footer({
  nowLabel,
  onNow,
  autoLabel,
  autoOn,
  onAuto,
  note,
}: {
  nowLabel: string
  onNow: () => void
  autoLabel: string
  autoOn: boolean
  onAuto: () => void
  note: string | null
}) {
  const titleId = useId()
  return (
    <>
      {note ? <p className={styles.note} id={titleId}>{note}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onNow}>{nowLabel}</button>
        <button type="button" className={styles.ghost} aria-pressed={autoOn} onClick={onAuto}>{autoLabel}</button>
      </div>
    </>
  )
}
