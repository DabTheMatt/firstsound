import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fxLfoKindForParam } from '../../audio/fx/lfo'
import { eqParamIndex } from '../../audio/random/groups'
import {
  RANDOM_DIVISIONS,
  RANDOM_FREE_RATES,
  defaultParamRandom,
  type ParamRandom,
  type RandomDivisionId,
  type RandomSync,
  type RandomTransition,
} from '../../audio/random/types'
import { isRandomizable } from '../../audio/random/distributions'
import type { ParamId } from '../../audio/parameters/types'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { DiceIcon, GearIcon } from './icons'
import { RandomLayer } from './RandomLayer'
import styles from './Random.module.css'

type Props = {
  id: ParamId
  compact?: boolean
  touch?: boolean
}

export function RandomAffordance({ id, compact = false, touch = false }: Props) {
  const snap = useEngine()
  const { paramLabel, t } = useI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  if (!isRandomizable(id)) return null
  const gen = snap.random.generators[id] ?? defaultParamRandom()
  const auto = Boolean(gen.auto && snap.random.chaos)
  const label = paramLabel(id)
  const closeEditor = () => setOpen(false)
  const pairClass = touch ? styles.touchPair : compact ? styles.pairCompact : styles.pair

  return (
    <>
      <div ref={rootRef} className={pairClass} data-random-pair="param" data-random-for={id}>
        <button
          type="button"
          className={touch ? styles.touch : compact ? `${styles.button} ${styles.buttonCompact}` : styles.dice}
          data-active={auto ? 'true' : 'false'}
          data-random-for={id}
          aria-label={t.random.randomizeNow}
          title={compact || touch ? undefined : t.random.randomize}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            engine.randomizeParam(id)
          }}
        >
          <DiceIcon />
        </button>
        <button
          type="button"
          className={touch ? styles.touch : compact ? `${styles.button} ${styles.buttonCompact}` : styles.gear}
          data-active={auto ? 'true' : 'false'}
          data-open={open ? 'true' : 'false'}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={t.random.setupAria}
          title={compact || touch ? undefined : t.random.setup}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setOpen((value) => !value)
          }}
        >
          <GearIcon />
        </button>
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <RandomLayer
              anchorRef={rootRef}
              label={t.random.setup}
              title={t.random.title(label)}
              onClose={closeEditor}
            >
              <RandomFields id={id} gen={gen} chaos={snap.random.chaos} budget={snap.random.budgetLimited} onClose={closeEditor} />
            </RandomLayer>,
            document.body,
          )
        : null}
    </>
  )
}

function RandomFields({
  id,
  gen,
  chaos,
  budget,
  onClose,
}: {
  id: ParamId
  gen: ParamRandom
  chaos: boolean
  budget: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const kind = fxLfoKindForParam(id)
  const band = eqParamIndex(id)
  const set = (patch: Partial<ParamRandom>) => engine.setParamRandom(id, patch)
  return (
    <>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            engine.randomizeParam(id)
          }}
        >
          {t.random.now}
        </button>
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.choice}
          aria-pressed={gen.auto && chaos}
          onClick={() => {
            if (gen.auto && chaos) set({ auto: false })
            else if (chaos) set({ auto: true })
            else engine.requestChaos(id)
          }}
        >
          {t.random.auto} {gen.auto && chaos ? t.random.on : t.random.off}
        </button>
        <button type="button" className={styles.choice} aria-pressed={gen.sync === 'free'} onClick={() => set({ sync: 'free' satisfies RandomSync })}>
          {t.random.free}
        </button>
        <button type="button" className={styles.choice} aria-pressed={gen.sync === 'tempo'} onClick={() => set({ sync: 'tempo' })}>
          {t.random.sync}
        </button>
      </div>
      {gen.sync === 'free' ? (
        <div className={styles.row} role="group" aria-label={t.random.rate}>
          {RANDOM_FREE_RATES.map((rate) => (
            <button key={rate} type="button" className={styles.choice} aria-pressed={gen.rateHz === rate} onClick={() => set({ rateHz: rate })}>
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
            onChange={(event) => set({ division: event.target.value as RandomDivisionId })}
          >
            {RANDOM_DIVISIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={styles.field}>
        {t.random.intensity}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(gen.intensity * 100)}
          aria-label={t.random.intensity}
          onChange={(event) => set({ intensity: Number(event.target.value) / 100 })}
        />
        <span>{Math.round(gen.intensity * 100)}%</span>
      </label>
      <div className={styles.row} role="group" aria-label={t.random.transition}>
        {(['step', 'smooth'] as RandomTransition[]).map((mode) => (
          <button key={mode} type="button" className={styles.choice} aria-pressed={gen.transition === mode} onClick={() => set({ transition: mode })}>
            {mode === 'step' ? t.random.step : t.random.smooth}
          </button>
        ))}
      </div>
      {budget ? <p className={styles.note}>{t.random.budget}</p> : null}
      {!chaos ? <p className={styles.note}>{t.random.chaosHint}</p> : null}
      {chaos && kind ? (
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => engine.randomizeEffect(kind)}>
            {t.random.randomizeEffect}
          </button>
        </div>
      ) : null}
      {chaos && band != null ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              engine.randomizeEqBand(band)
              onClose()
            }}
          >
            {t.random.randomizeBand}
          </button>
        </div>
      ) : null}
    </>
  )
}
