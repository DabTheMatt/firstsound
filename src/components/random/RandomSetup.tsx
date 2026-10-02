import { useState } from 'react'
import type { EqBand } from '../../audio/engine/eqBands'
import { EQ_BAND_LFO_KINDS, FX_LFO_KIND_LABELS, type FxLfoKind } from '../../audio/fx/lfo'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import { randomWindow } from '../../audio/random/distributions'
import {
  defaultRandomTargets,
  eqBandUsesFullRandom,
  partitionRandomTargets,
  participatingTargets,
} from '../../audio/random/groups'
import {
  RANDOM_DIVISIONS,
  RANDOM_FREE_RATES,
  defaultParamRandom,
  type ParamRandom,
  type RandomDivisionId,
  type RandomDocument,
  type RandomSync,
  type RandomTransition,
} from '../../audio/random/types'
import { engine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import styles from './Random.module.css'

export type SetupGroup = {
  key: string
  title: string | null
  kind: FxLfoKind
  ids: ParamId[]
}

export function effectSetupGroups(kind: FxLfoKind): SetupGroup[] {
  return [{ key: kind, title: null, kind, ids: defaultRandomTargets(kind) }]
}

export function eqSetupGroups(bands: readonly EqBand[], combEnabled: boolean): SetupGroup[] {
  const groups: SetupGroup[] = []
  bands.forEach((band, index) => {
    if (band.type === 'off') return
    const kind = EQ_BAND_LFO_KINDS[index]
    if (!kind) return
    const ids = defaultRandomTargets(kind)
    if (ids.length === 0) return
    groups.push({ key: kind, title: FX_LFO_KIND_LABELS[kind], kind, ids })
  })
  if (combEnabled) {
    const ids = defaultRandomTargets('eqcf')
    if (ids.length > 0) groups.push({ key: 'eqcf', title: FX_LFO_KIND_LABELS.eqcf, kind: 'eqcf', ids })
  }
  return groups
}

export function randomizeConfiguredEffect(kind: FxLfoKind, chaos: boolean): void {
  if (!chaos) {
    engine.requestChaos()
    return
  }
  engine.randomizeEffect(kind)
}

export function randomizeConfiguredEq(bands: readonly EqBand[], combEnabled: boolean, doc: RandomDocument): void {
  if (!doc.chaos) {
    engine.requestChaos()
    return
  }
  bands.forEach((band, index) => {
    if (band.type === 'off') return
    const kind = EQ_BAND_LFO_KINDS[index]
    if (!kind) return
    if (eqBandUsesFullRandom(doc, kind)) {
      engine.randomizeEqBand(index, true)
      return
    }
    for (const id of participatingTargets(doc, kind)) engine.randomizeParam(id)
  })
  if (combEnabled) engine.randomizeEffect('eqcf')
}

function writeTargets(ids: readonly ParamId[], patch: Partial<ParamRandom>): void {
  for (const id of ids) engine.setParamRandom(id, patch)
}

function selectedIds(doc: RandomDocument, groups: readonly SetupGroup[]): ParamId[] {
  return groups.flatMap((group) => participatingTargets(doc, group.kind))
}

function representative(ids: readonly ParamId[], doc: RandomDocument): { gen: ParamRandom; mixed: boolean } {
  const gens = ids.map((id) => doc.generators[id] ?? defaultParamRandom())
  const gen = gens[0] ?? defaultParamRandom()
  const mixed = gens.some(
    (item) =>
      item.auto !== gen.auto ||
      item.sync !== gen.sync ||
      item.rateHz !== gen.rateHz ||
      item.division !== gen.division ||
      item.intensity !== gen.intensity ||
      item.transition !== gen.transition,
  )
  return { gen, mixed }
}

type PanelProps = {
  name: string
  titleId?: string
  groups: readonly SetupGroup[]
  doc: RandomDocument
  chaos: boolean
  budget: boolean
  eq: boolean
}

export function RandomSetupPanel({ name, titleId, groups, doc, chaos, budget, eq }: PanelProps) {
  const { t, paramLabel } = useI18n()
  const [openId, setOpenId] = useState<ParamId | null>(null)
  const selected = selectedIds(doc, groups)
  const shared = representative(selected, doc)
  const armed = selected.length > 0 && selected.every((id) => doc.generators[id]?.auto && chaos)
  const setShared = (patch: Partial<ParamRandom>) => writeTargets(selected, patch)
  const setParticipation = (kind: FxLfoKind, next: readonly ParamId[]) => engine.setRandomParticipation(kind, next)
  return (
    <>
      <h2 id={titleId} className={styles.title}>{t.random.setupTitle(name)}</h2>
      {groups.length === 0 ? <p className={styles.note}>{t.random.noEqBands}</p> : null}
      {groups.map((group) => {
        const split = partitionRandomTargets(group.ids)
        const chosen = participatingTargets(doc, group.kind)
        return (
          <section key={group.key} className={styles.group}>
            {group.title ? <h3 className={styles.groupTitle}>{group.title}</h3> : null}
            {split.parameters.length > 0 ? <p className={styles.sectionLabel}>{t.random.targets}</p> : null}
            {split.parameters.map((id) => (
              <TargetRow
                key={id}
                id={id}
                label={paramLabel(id)}
                checked={chosen.includes(id)}
                open={openId === id}
                gen={doc.generators[id] ?? defaultParamRandom()}
                chaos={chaos}
                onToggle={() => {
                  const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]
                  setParticipation(group.kind, next)
                }}
                onOpen={() => setOpenId((current) => (current === id ? null : id))}
              />
            ))}
            {split.modes.length > 0 ? <p className={styles.sectionLabel}>{t.random.modes}</p> : null}
            {split.modes.map((id) => (
              <TargetRow
                key={id}
                id={id}
                label={paramLabel(id)}
                checked={chosen.includes(id)}
                open={openId === id}
                gen={doc.generators[id] ?? defaultParamRandom()}
                chaos={chaos}
                onToggle={() => {
                  const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]
                  setParticipation(group.kind, next)
                }}
                onOpen={() => setOpenId((current) => (current === id ? null : id))}
              />
            ))}
          </section>
        )
      })}
      {groups.length > 0 ? (
        <div className={styles.bulk}>
          <button
            type="button"
            onClick={() => {
              for (const group of groups) setParticipation(group.kind, group.ids)
            }}
          >
            {t.random.all}
          </button>
          <button
            type="button"
            onClick={() => {
              for (const group of groups) setParticipation(group.kind, [])
            }}
          >
            {t.random.none}
          </button>
        </div>
      ) : null}
      {eq && groups.length > 0 ? <p className={styles.note}>{t.random.eqTypeNote}</p> : null}
      <p className={styles.sectionLabel}>{t.random.behavior}</p>
      {selected.length > 1 ? <p className={styles.note}>{t.random.appliesTo}</p> : null}
      {shared.mixed ? <p className={styles.note}>{t.random.mixed}</p> : null}
      <GeneratorFields
        id={selected[0] ?? null}
        gen={shared.gen}
        chaos={chaos}
        disabled={selected.length === 0}
        showAuto={false}
        onPatch={setShared}
      />
      <p className={styles.sectionLabel}>{t.random.auto}</p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.choice}
          aria-pressed={armed}
          disabled={selected.length === 0}
          onClick={() => {
            if (armed) {
              for (const group of groups) engine.setEffectAuto(group.kind, false)
              return
            }
            if (!chaos) {
              engine.requestChaos()
              return
            }
            for (const group of groups) engine.setEffectAuto(group.kind, true)
          }}
        >
          {t.random.auto} {armed ? t.random.on : t.random.off}
        </button>
      </div>
      <GeneratorFields
        id={selected[0] ?? null}
        gen={shared.gen}
        chaos={chaos}
        disabled={selected.length === 0}
        showAuto={false}
        timingOnly
        onPatch={setShared}
      />
      {budget ? <p className={styles.note}>{t.random.budget}</p> : null}
      {!chaos ? <p className={styles.note}>{t.random.chaosHint}</p> : null}
    </>
  )
}

function TargetRow({
  id,
  label,
  checked,
  open,
  gen,
  chaos,
  onToggle,
  onOpen,
}: {
  id: ParamId
  label: string
  checked: boolean
  open: boolean
  gen: ParamRandom
  chaos: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const { t } = useI18n()
  const span = randomWindow(id, chaos)
  const def = PARAMS[id]
  return (
    <div className={styles.targetBlock} data-open={open ? 'true' : 'false'}>
      <div className={styles.target}>
        <label className={styles.check}>
          <input type="checkbox" checked={checked} aria-label={label} onChange={onToggle} />
        </label>
        <button type="button" className={styles.targetName} onClick={onOpen}>
          {label}
        </button>
        <button
          type="button"
          className={styles.chevron}
          aria-expanded={open}
          aria-label={open ? t.random.hideTarget(label) : t.random.showTarget(label)}
          onClick={onOpen}
        >
          {open ? '˅' : '›'}
        </button>
      </div>
      {open ? (
        <div className={styles.detail}>
          <p className={styles.rangeLine}>
            <span>{t.random.range}</span>
            <span>
              {formatParamValue(span.min, def)} … {formatParamValue(span.max, def)}
            </span>
          </p>
          <GeneratorFields id={id} gen={gen} chaos={chaos} disabled={false} showAuto onPatch={(patch) => engine.setParamRandom(id, patch)} />
        </div>
      ) : null}
    </div>
  )
}

function GeneratorFields({
  id,
  gen,
  chaos,
  disabled,
  showAuto,
  timingOnly = false,
  onPatch,
}: {
  id: ParamId | null
  gen: ParamRandom
  chaos: boolean
  disabled: boolean
  showAuto: boolean
  timingOnly?: boolean
  onPatch: (patch: Partial<ParamRandom>) => void
}) {
  const { t } = useI18n()
  const autoOn = Boolean(gen.auto && chaos)
  return (
    <>
      {timingOnly ? null : (
        <>
          <label className={styles.field}>
            {t.random.intensity}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              value={Math.round(gen.intensity * 100)}
              aria-label={t.random.intensity}
              onChange={(event) => onPatch({ intensity: Number(event.target.value) / 100 })}
            />
            <span>{Math.round(gen.intensity * 100)}%</span>
          </label>
          <div className={styles.row} role="group" aria-label={t.random.transition}>
            {(['step', 'smooth'] as RandomTransition[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={styles.choice}
                disabled={disabled}
                aria-pressed={gen.transition === mode}
                onClick={() => onPatch({ transition: mode })}
              >
                {mode === 'step' ? t.random.step : t.random.smooth}
              </button>
            ))}
          </div>
        </>
      )}
      {showAuto ? (
        <div className={styles.row}>
          <button
            type="button"
            className={styles.choice}
            aria-pressed={autoOn}
            disabled={disabled || id == null}
            onClick={() => {
              if (id == null) return
              if (autoOn) onPatch({ auto: false })
              else if (chaos) onPatch({ auto: true })
              else engine.requestChaos(id)
            }}
          >
            {t.random.auto} {autoOn ? t.random.autoAllowed : t.random.off}
          </button>
        </div>
      ) : null}
      {timingOnly || showAuto ? (
        <>
          <p className={styles.sectionLabel}>{t.random.timing}</p>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.choice}
              disabled={disabled}
              aria-pressed={gen.sync === 'free'}
              onClick={() => onPatch({ sync: 'free' satisfies RandomSync })}
            >
              {t.random.free}
            </button>
            <button
              type="button"
              className={styles.choice}
              disabled={disabled}
              aria-pressed={gen.sync === 'tempo'}
              onClick={() => onPatch({ sync: 'tempo' })}
            >
              {t.random.sync}
            </button>
          </div>
          {gen.sync === 'free' ? (
            <div className={styles.row} role="group" aria-label={t.random.rate}>
              {RANDOM_FREE_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={styles.choice}
                  disabled={disabled}
                  aria-pressed={gen.rateHz === rate}
                  onClick={() => onPatch({ rateHz: rate })}
                >
                  {rate} Hz
                </button>
              ))}
            </div>
          ) : (
            <label className={styles.field}>
              {t.random.division}
              <select
                value={gen.division}
                aria-label={t.random.division}
                disabled={disabled}
                onChange={(event) => onPatch({ division: event.target.value as RandomDivisionId })}
              >
                {RANDOM_DIVISIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      ) : null}
    </>
  )
}
